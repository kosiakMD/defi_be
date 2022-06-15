import { MinSwapAssetService } from 'apps/integration/src/modules/microservices/minswap.asset.service.';
import { Cache } from 'cache-manager';
import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';

import { FeatureEnum } from '../../../enums';
import { IProtocolMeta } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
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
import { FARM_POOL_INFO, IFarmInfo, IFarmInfoResponse } from '../../Subgraphs/MinswapSubgraph';

type ExtraRewards = { apr: number };
export type IFeatureEntryMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  IRewardTokenMinimal<ExtraRewards>[],
  void,
  void
>;
export type IFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity[],
  void,
  void
>;
export type IFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry[],
  void,
  void
>;

export interface IMinSwapStakingMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  context: {
    endpoint: string;
    rewardedToken: string;
  };
}

export class MinSwapStaking extends CardanoCore<
  IFeatureEntryMinimal,
  IFeatureOpportunity,
  IFeatureUserEntry,
  IMinSwapStakingMeta
> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: MinSwapAssetService,
    protected httpService: HttpService,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<IFeatureEntryMinimal[]> {
    const pools = await this.fetchFarms();
    const farmPoolInfo = pools.data.farmPoolInfo;
    return farmPoolInfo.map(this.minFarmToMinimalFeature.bind(this));
  }

  protected async fetchUserData(
    address: string,
    pools: IFeatureOpportunity[],
  ): Promise<IFeatureUserEntry[]> {
    const data = await this.fetchFarms(address);
    const poolMap = new Map(pools.map((p) => [p.id, p]));

    const userEntry: IFeatureUserEntry[] = [];
    for (const farm of data.data.farmPoolInfo) {
      const position = poolMap.get(
        this.toTokenId(farm.lpAsset.currencySymbol, farm.lpAsset.tokenName),
      );
      if (farm.liquidityStaking === 0 || !position) continue;

      const minRewarded = position.rewarded.find(
        (x) => x.token.address === this.meta.context.rewardedToken,
      );
      const pendingReward = normalizeDecimals(
        farm.pendingReward.toString(),
        minRewarded.token.decimals,
      );

      const extraRewards: IRewardTokenUserEntry[] = position.rewarded
        .filter((x) => x.token.address !== this.meta.context.rewardedToken)
        .map((reward) => {
          const extraToken = farm.extraRewards.find(
            (x) =>
              this.toTokenId(x.asset.currencySymbol, x.asset.tokenName) === reward.token.address,
          );
          if (!extraToken) return null;
          const pendingReward = normalizeDecimals(
            extraToken.pendingReward.toString(),
            reward.token.decimals,
          );

          return {
            ...reward,
            amount: pendingReward,
            value: pendingReward * reward.token.price,
          };
        });

      userEntry.push({
        ...position,
        supply: {
          ...position.supply,
          amount: farm.liquidityStaking,
          value: position.supply.token.price * farm.liquidityStaking,
        },
        rewarded: [
          {
            ...minRewarded,
            amount: pendingReward,
            value: pendingReward * minRewarded.token.price,
          },
          ...extraRewards,
        ],
      });
    }

    return userEntry;
  }

  protected formatOpportunityRewardedToken(
    poolToken: IRewardTokenMinimal<ExtraRewards>,
    token: ERC20Token,
    // tvl: number, // for calculating apr
  ): IRewardTokenOpportunity {
    return {
      token,
      harvests: null,
      // Note: This only includes APR for _this token's rewards_ on the farm
      // so any trading fees are not included here
      apr: {
        year: poolToken.extra.apr / 100,
      },
      apy: null,
    };
  }

  private async fetchFarms(address = ''): Promise<IFarmInfoResponse> {
    return this.post<IFarmInfoResponse>(this.meta.context.endpoint + '?FarmPoolInfo', {
      query: FARM_POOL_INFO,
      variables: { address },
    });
  }

  /**
   * Formats basic HTTP result min farm to FeatureMinimal
   */
  private minFarmToMinimalFeature(pool: IFarmInfo): IFeatureEntryMinimal {
    const rewarded: IRewardTokenMinimal<ExtraRewards>[] = [
      {
        token: {
          address: this.meta.context.rewardedToken,
        },
        extra: {
          apr: pool.baseAPR,
        },
      },
    ];

    if (pool.extraRewards.length > 0) {
      pool.extraRewards.map((position) => {
        rewarded.push({
          token: {
            address: this.toTokenId(position.asset.currencySymbol, position.asset.tokenName),
          },
          extra: {
            apr: position.baseAPR,
          },
        });
      });
    }

    return {
      id: this.toTokenId(pool.lpAsset.currencySymbol, pool.lpAsset.tokenName),
      chain: this.meta.chain,
      feature: this.meta.feature,
      supply: {
        token: {
          address: this.toTokenId(pool.lpAsset.currencySymbol, pool.lpAsset.tokenName),
        },
        totalSupplied: pool.totalLiquidityStaking.toString(),
      },
      rewarded: rewarded,
    };
  }

  private toTokenId(policyId: string, symbol: string) {
    return `${policyId}.${symbol}`;
  }

  private post<T>(url: string, body?: Record<string, any>): Promise<T> {
    const config = { headers: { origin: 'https://defiyield.app' } };
    return firstValueFrom(this.httpService.post(url, body, config).pipe(map(({ data }) => data)));
  }
}
