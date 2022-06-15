import { FakeAssetService } from 'apps/integration/src/modules/microservices/fake.asset.service';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { SOL_COIN_ADDRESS } from '@app/common/constant';
import { normalizeDecimals } from '@app/common/utils';

import { RootProtocolCacheable } from '../../../RootProtocolCacheable';
import { FeatureEnum } from '../../../enums';
import { IProtocolMeta } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { IRewardTokenUserEntry } from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';

interface ValidatorInfo {
  address: string;
  name: string;
  website: string;
}
interface DelegationExtras {
  validator: ValidatorInfo;
}

type DelegationMinimal = BaseWithTokens<ISupplyTokenMinimal>;
type DelegationOpportunity = BaseWithTokens<ISupplyTokenOpportunity>;
type DelegationEntry = BaseWithTokens<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry,
  void,
  DelegationExtras
>;

export class SolanaDelegation extends RootProtocolCacheable<
  DelegationMinimal,
  DelegationOpportunity,
  DelegationEntry,
  IProtocolMeta
> {
  private endpoint = `https://api.solanabeach.io/v1/account`;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) protected readonly cache: Cache,
    protected readonly assetService: FakeAssetService,
    protected readonly httpService: HttpService,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<DelegationMinimal[]> {
    return [
      {
        id: 'solana-native-delegation',
        feature: FeatureEnum.delegation, // TODO: delegation?
        chain: ChainIdEnum.sol,
        // links?: IFeatureLinks;  // TODO: links to delegation site somewhere?
        supply: { token: { address: SOL_COIN_ADDRESS } }, // TODO: this is 000000 but should be 111111
        // supply: { token: { address: 'So11111111111111111111111111111111111111112' } },
      },
    ];
  }

  async fetchUserData(
    address: Address,
    pools: DelegationOpportunity[],
  ): Promise<DelegationEntry[]> {
    // There is always exactly one
    const [pool] = pools;
    const { token } = pool.supply;
    const results: DelegationEntry[] = [];
    const stakesData = await this.get(`${this.endpoint}/${address}/stakes?limit=1000`);

    for (const staking of stakesData.data) {
      const stakingRewardsData = await this.get(
        `${this.endpoint}/${staking.pubkey.address}/stake-rewards`,
      );

      const stakingReward = stakingRewardsData[0];
      if (stakingReward) {
        const balanceAmount = normalizeDecimals(stakingReward.postBalance, token.decimals);
        const claimableRewardsAmount = normalizeDecimals(stakingReward.amount, token.decimals);
        const { identityPubkey, name, website } = staking.data.stake.delegation.validatorInfo;

        results.push({
          ...pool,
          links: {
            opportunity: website, // validator website
          },
          supply: {
            token,
            tvl: 0,
            amount: balanceAmount,
            value: balanceAmount * token.price,
          },
          reward: {
            token,
            amount: claimableRewardsAmount,
            value: claimableRewardsAmount * token.price,
            apr: null,
            apy: null,
          },
          meta: {
            validator: {
              address: identityPubkey,
              name: name,
              website: website,
            },
          },
        });
      }
    }
    return results;
  }

  private async get(url: string) {
    return firstValueFrom(this.httpService.get(url).pipe(map((a) => a.data)));
  }
}
