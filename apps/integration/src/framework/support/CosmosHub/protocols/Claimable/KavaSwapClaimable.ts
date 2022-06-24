import { FakeAssetService } from 'apps/integration/src/modules/microservices/fake.asset.service';
import BN from 'bignumber.js';
import { Cache } from 'cache-manager';
import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';

import { IRootProtocol } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from '../../../interfaces/tokens.rewarded.interface';
import { SingleContractProtocol } from '../../SingleContractProtocol';
import {
  IKavaClaimable,
  IKavaClaimableResponse,
  IKavaMeta,
  IKavaUserRewards,
} from '../interfaces/Kava/KavaClaimable';

export type IClaimableFeatureEntryMinimal = BaseWithTokens<void, IRewardTokenMinimal, void, void>;
export type IClaimableFeatureEntryOpportunity = BaseWithTokens<
  void,
  IRewardTokenOpportunity,
  void,
  void
>;
export type IClaimableFeatureEntryUser = BaseWithTokens<void, IRewardTokenUserEntry, void, void>;

export class KavaSwapClaimable
  extends SingleContractProtocol<
    IClaimableFeatureEntryMinimal,
    IClaimableFeatureEntryOpportunity,
    IClaimableFeatureEntryUser,
    IKavaMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: FakeAssetService,
    protected httpService: HttpService,
  ) {
    super();
  }

  get incentiveClaimable(): string {
    return new URL('/incentive/rewards', this.meta.context.endpoint).toString();
  }
  get parametersClaimable(): string {
    return new URL('/incentive/parameters', this.meta.context.endpoint).toString();
  }

  async getCacheableOpportunityData(): Promise<IClaimableFeatureEntryMinimal[]> {
    const $data = this.httpService.get(this.parametersClaimable).pipe(
      map(({ data }) => data.result?.swap_reward_periods),
      toArray(),
    );

    const collaterals = await firstValueFrom($data);

    const rewardTokens: string[] = collaterals[0].flatMap((collateral) => {
      return collateral['rewards_per_second'].flatMap((rewarded) => rewarded.denom);
    });

    return Array.from(new Set(rewardTokens)).map((address) =>
      this.toClaimableFeatureEntryMinimal(address),
    );
  }

  protected async fetchUsersData(addresses: string[]): Promise<Map<string, IKavaUserRewards[]>> {
    const deposits = await Promise.all(addresses.map((address) => this.accountClaimable(address)));
    const claimableMap: Map<string, IKavaUserRewards[]> = new Map();
    const claimableUserMap: Map<string, IKavaUserRewards[]> = new Map();

    for (const deposit of deposits.flat()) {
      if (!deposit) continue;
      if (!claimableMap.has(deposit.owner)) {
        claimableMap.set(deposit.owner, []);
      }
      claimableMap.get(deposit.owner).push(...deposit.reward);
    }

    for (const [address, claimable] of claimableMap.entries()) {
      const rewardsMap: Record<string, IKavaUserRewards> = {};

      for (const { denom, amount } of claimable) {
        if (rewardsMap[denom]) {
          const computed = new BN(rewardsMap[denom].amount) //
            .plus(amount)
            .toString();
          rewardsMap[denom].amount = computed;
        } else {
          rewardsMap[denom] = { amount, denom };
        }
      }

      claimableUserMap.set(address, Object.values(rewardsMap));
    }

    return claimableUserMap;
  }

  protected formatUserData(
    address: string,
    pools: IClaimableFeatureEntryOpportunity[],
    data: Map<string, IKavaUserRewards[]>,
  ): IClaimableFeatureEntryUser[] {
    return data.get(address).map((rewards) => {
      const opportunity = pools.find((x) => x.reward.token.address === rewards.denom);
      if (!opportunity) return;

      const { reward, ...other } = opportunity;
      const normalizedAmount = normalizeDecimals(rewards.amount, reward.token.decimals);

      const cloneOpportunity: IClaimableFeatureEntryUser = {
        ...other,
        reward: {
          ...reward,
          amount: normalizedAmount,
          value: normalizedAmount * reward.token.price,
        },
      };

      return cloneOpportunity;
    });
  }

  protected toClaimableFeatureEntryMinimal(tokenAddresses: string): IClaimableFeatureEntryMinimal {
    return {
      id: tokenAddresses + '::' + 'swap-claimable',
      chain: this.meta.chain,
      feature: this.meta.feature,
      reward: {
        token: {
          address: tokenAddresses,
        },
      },
    };
  }

  protected accountClaimable(address: string): Promise<IKavaClaimable[]> {
    const $data = this.httpService
      .get<IKavaClaimableResponse>(this.incentiveClaimable, {
        params: { owner: address },
      })
      .pipe(
        mergeMap((response) => {
          return [response.data.result?.swap_claims?.[0]?.base_claim];
        }),
        toArray(),
      );
    return firstValueFrom($data);
  }
}
