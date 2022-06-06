import { MuesliSwapAccountService } from 'apps/integration/src/modules/microservices/MuesliSwapAccountService';
import {
  IMuesliSwapStakingPool,
  IMuesliSwapStakingRewards,
} from 'apps/integration/src/modules/protocols/protocols/muesliswap/muesliswap.interfaces';
import { Cache } from 'cache-manager';
import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { stringToHex } from '@app/common/utils';

import { MuesliSwapPriceService } from '../../../../modules/microservices/MuesliSwapPriceService';
import { CardanoService } from '../../../../modules/protocols/helpers/cardano/cardano.service';
import { IProtocolMeta } from '../../interfaces';
import { BaseWithTokens } from '../../interfaces/new.interfaces';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from '../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../interfaces/tokens.supplied.interface';
import { CardanoCore } from '../CardanoCore';

interface IMilkPoolExtra {
  endDate: string; // "2022-04-01T12:00:00+00:00"
  tokensLeft: number;
  poolSize: number;
}

export type IFeatureEntryMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  IRewardTokenMinimal,
  void,
  IMilkPoolExtra
>;
export type IFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity,
  void,
  IMilkPoolExtra
>;
export type IFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry,
  void,
  IMilkPoolExtra
>;

export interface IMuesliSwapMilkPoolsMeta extends IProtocolMeta {
  context?: any;
}

// unsavable? - bad checksum. could this be due to the hex value having a letter?
// 2c96f49b6e6e32ae69a182e85b74db4edfc9539496a13ab76d1258fa434e54  => d270f56bdb6c68d6960cfda5aa7b3403745a2bfc
// 9a2ff23d533e7f8c009e2f51c49896aa28c066946b89d2ccd55ab84743524545505a  => ae19d2ef4b1eae3f0e7750ba76685337b33f97b9
// f09deff3d6fe282874ac5c3c541f566cfe5ecec9058b814f1acd074262624c6f6273746572  => bfb9172b044f5f1504330bee2361e06179105358
// 63766427b4499dd678cb8b715dec3265dd292279ce7779447e3651e54b4f5a  => 302613e4406aecdf38d748f9eb537f5cbda815e9

export class MuesliSwapMilkPools extends CardanoCore<
  IFeatureEntryMinimal,
  IFeatureOpportunity,
  IFeatureUserEntry,
  IMuesliSwapMilkPoolsMeta
> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: MuesliSwapAccountService,
    protected priceService: MuesliSwapPriceService,
    protected httpService: HttpService,
    private readonly cardanoUtils: CardanoService,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<IFeatureEntryMinimal[]> {
    const pools = await this.fetchMilkPools();
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

  /**
   *
   * @returns
   */
  private async fetchMilkPools(): Promise<IMuesliSwapStakingPool[]> {
    return this.get(`https://staking.muesliswap.com/tokens-info`);
  }
  private async fetchStakingRewards(address: string): Promise<IMuesliSwapStakingRewards[]> {
    return this.get(`https://staking.muesliswap.com/my-rewards`, {
      pkh: this.cardanoUtils.addressToBlake224(address),
    });
  }

  /**
   * Formats basic HTTP result milk pool to FeatureMinimal
   */
  private milkPoolToMinimalFeature(pool: IMuesliSwapStakingPool): IFeatureEntryMinimal {
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
          address: this.toTokenId(pool.rewardPolicyId, pool.rewardName), // or rewardSymbol?
        },
      },
      meta: {
        endDate: pool.poolEndTime,
        tokensLeft: pool.tokensLeft,
        poolSize: pool.poolSize,
      },
    };
  }

  private toTokenId(policyId: string, symbol: string) {
    return `${policyId}.${stringToHex(symbol)}`;
  }

  private get<T>(url: string, params?: { [key: string]: unknown }): Promise<T> {
    return firstValueFrom(this.httpService.get(url, { params }).pipe(map(({ data }) => data)));
  }
}
