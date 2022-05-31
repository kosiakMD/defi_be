import BN from 'bignumber.js';
import { Cache } from 'cache-manager';
import { firstValueFrom, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { IRootProtocol, IUserDataProtocolResponse } from '../../../interfaces';
import {
  IClaimableFeatureOpportunity,
  IClaimableFeatureUser,
} from '../../../interfaces/feature-claimable.interface';
import { ERC20Token } from '../../../interfaces/tokens-common.interface';
import { SingleContractProtocol } from '../../single-contract-protocol';
import {
  IKavaClaimable,
  IKavaClaimableResponse,
  IKavaMeta,
  IKavaUserRewards,
} from '../interfaces/kava/kava-claimable';

/**
 * TODO: extends from non cacheable ContractProtocol.
 */
export class KavaClaimable
  extends SingleContractProtocol<
    never,
    IClaimableFeatureOpportunity,
    IClaimableFeatureUser,
    IKavaMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
  ) {
    super();
  }

  initialize(): Promise<void> {
    return;
  }

  get incentiveClaimable(): string {
    return new URL('/incentive/rewards', this.meta.context.endpoint).toString();
  }

  getCacheableOpportunityData(): Promise<[]> {
    return Promise.resolve([]);
  }

  async getUsersData(
    addresses: string[],
  ): Promise<IUserDataProtocolResponse<IClaimableFeatureUser>> {
    const results = new Map<string, IClaimableFeatureUser[]>(
      addresses.map((address) => [address, [] as IClaimableFeatureUser[]]),
    );
    const errors = [];

    try {
      const multicallResults = await this.fetchUserData(addresses);
      const tokens = await this.claimableUsersTokens(multicallResults);
      const opportunityTokens = this.claimableFeatureOpportunity(tokens);

      for (const address of addresses) {
        const data = this.formatUserData(address, opportunityTokens, multicallResults);
        results.get(address).push(...data);
      }
    } catch (err) {
      errors.push(err);
    }

    return { data: results, errors };
  }

  protected async fetchUserData(addresses: string[]): Promise<Map<string, IKavaUserRewards[]>> {
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
    opportunityTokens: IClaimableFeatureOpportunity[],
    data: Map<string, IKavaUserRewards[]>,
  ): IClaimableFeatureUser[] {
    return data.get(address).map((rewards) => {
      const opportunity = opportunityTokens.find((x) => x.id === rewards.denom);
      if (!opportunity) return;

      const { supplied, ...other } = opportunity;

      const cloneOpportunity: IClaimableFeatureUser = {
        ...other,
        supplied: supplied.map((token) => {
          const amount = new BN(normalizeDecimals(rewards.amount, token.token.decimals));
          const value = amount.times(token.token.price);
          return {
            token: token.token,
            amount: amount.toNumber(),
            value: value.toNumber(),
          };
        }),
      };

      return cloneOpportunity;
    });
  }

  protected formatOpportunity(): void {
    return;
  }

  private async claimableUsersTokens(
    multicallResults: Map<string, IKavaUserRewards[]>,
  ): Promise<[string, ERC20Token][]> {
    const tokenAddresses = Array.from(multicallResults.values())
      .flat()
      .map(({ denom }) => denom);

    return this.getTokens(tokenAddresses);
  }

  private claimableFeatureOpportunity(
    tokens: [string, ERC20Token][],
  ): IClaimableFeatureOpportunity[] {
    return tokens.map((token) => {
      const [id, claimableToken] = token;
      return {
        id: id,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [{ token: claimableToken }],
      };
    });
  }

  private accountClaimable(address: string): Promise<IKavaClaimable[]> {
    const $data = this.httpService
      .get<IKavaClaimableResponse>(this.incentiveClaimable, {
        params: { owner: address },
      })
      .pipe(
        mergeMap((response) => {
          return [
            response.data.result?.delegator_claims?.[0]?.base_claim,
            response.data.result?.hard_claims?.[0]?.base_claim,
            response.data.result?.swap_claims?.[0]?.base_claim,
          ];
        }),
        toArray(),
      );
    return firstValueFrom($data);
  }
}
