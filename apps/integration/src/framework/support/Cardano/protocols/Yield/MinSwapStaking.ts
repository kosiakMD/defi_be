import { MuesliSwapAssetService } from 'apps/integration/src/modules/microservices/muesliswap.asset.service';
import { Cache } from 'cache-manager';
import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { stringToHex } from '@app/common/utils';

import { CardanoService } from '../../../../../modules/protocols/helpers/cardano/cardano.service';
import { FeatureEnum } from '../../../enums';
import { IProtocolMeta } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { CardanoCore } from '../../CardanoCore';
import { FARM_POOL_INFO, IFarmPoolInfo } from '../../Subgraphs/MinswapSubgraph';

export type IFeatureEntryMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  IRewardTokenMinimal,
  void,
  void
>;
export type IFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity,
  void,
  void
>;
export type IFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry,
  void,
  void
>;

export interface IMinSwapPoolsMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  context: {
    endpoint: string;
  };
}

export class MinSwapStaking extends CardanoCore<
  IFeatureEntryMinimal,
  IFeatureOpportunity,
  IFeatureUserEntry,
  IMinSwapPoolsMeta
> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: MuesliSwapAssetService,
    protected httpService: HttpService,
    private readonly cardanoUtils: CardanoService,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<IFeatureEntryMinimal[]> {
    const pools = await this.fetchFarms();

    return pools.map(this.milkPoolToMinimalFeature.bind(this));
  }

  protected async fetchUserData(
    address: string,
    pools: IFeatureOpportunity[],
  ): Promise<IFeatureUserEntry[]> {
    const data = await this.fetchStakingRewards(address);
    const poolMap = new Map(pools.map((p) => [p.id, p]));

    return data.map((stakingData) => {
      const pool = poolMap.get(stakingData.pool_id);
      if (!pool) {
        // pool filtered out, likely missing tokens
        return null;
      }

      return {
        ...pool,
        supply: {
          ...pool.supply,
          amount: stakingData.amount_staked,
          value: pool.supply.token.price * stakingData.amount_staked,
        },
        reward: {
          ...pool.reward,
          amount: stakingData.reward,
          value: pool.reward.token.price * stakingData.reward,
        },
      };
    });
  }

  protected getHarvestBreakdown(): { apr: null; apy: null } {
    return { apr: null, apy: null };
  }

  protected getYieldBreakdown(): { apr: null; apy: null } {
    return { apr: null, apy: null };
  }

  private async fetchFarms(): Promise<IFarmPoolInfo[]> {
    return this.post(this.meta.context.endpoint + '?FarmPoolInfo', { query: FARM_POOL_INFO });
  }

  // private async fetchStakingRewards(address: string): Promise<IMuesliSwapStakingRewards[]> {
  //   return this.get(`https://staking.muesliswap.com/my-rewards`, {
  //     pkh: this.cardanoUtils.addressToBlake224(address),
  //   });
  // }

  /**
   * Formats basic HTTP result milk pool to FeatureMinimal
   */
  private milkPoolToMinimalFeature(pool: any): IFeatureEntryMinimal {
    return {
      id: pool.poolId,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supply: {
        token: {
          address: this.toTokenId(pool.stakingPolicyId, pool.stakingName),
        },
        totalSupplied: pool.amountStaked,
      },
      reward: {
        token: {
          address: this.toTokenId(pool.rewardPolicyId, pool.rewardName),
        },
      },
      // meta: {
      //   endDate: pool.poolEndTime,
      //   tokensLeft: pool.tokensLeft,
      //   poolSize: pool.poolSize,
      // },
    };
  }

  private toTokenId(policyId: string, symbol: string) {
    return `${policyId}.${stringToHex(symbol)}`;
  }

  private post<T>(url: string, body?: Record<string, any>): Promise<T> {
    return firstValueFrom(this.httpService.post(url, body).pipe(map(({ data }) => data)));
  }
}
