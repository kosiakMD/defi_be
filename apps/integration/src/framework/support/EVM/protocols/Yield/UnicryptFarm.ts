import { AssetService } from 'apps/integration/src/modules/microservices/asset.service';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { IRewardTokenOpportunity } from '../../../interfaces/tokens.rewarded.interface';
import { ISupplyTokenOpportunity } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { UnicryptStakePool } from '../../Contracts/Unicrypt/UnicryptStakePool';
import { EVMCore } from '../../EVMCore';
import {
  IUnicryptFarmHttpSearchResponse,
  IUnicryptFarmEntryMinimal,
  IUnicryptFarmOpportunity,
  IUnicryptFarmUserEntry,
  UnicryptFarmMetaInterface,
  IUnicryptFarmSupplyTokenMinimal,
  IUnicryptFarmRewardTokenMinimal,
} from './UnicryptFarm.types';

export class UnicryptFarm extends EVMCore<
  IUnicryptFarmEntryMinimal,
  IUnicryptFarmOpportunity,
  IUnicryptFarmUserEntry,
  UnicryptFarmMetaInterface
> {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: AssetService,
    protected httpService: HttpService,
  ) {
    super();
  }

  /**************************************
   * Get Pools
   **************************************/

  /**
   * Gets all required data to fill pools list
   */
  async getCacheableOpportunityData(): Promise<IUnicryptFarmEntryMinimal[]> {
    const { data } = await firstValueFrom(
      this.httpService.post<IUnicryptFarmHttpSearchResponse>(this.meta.context.search, {
        filters: { sort: 'tvl', sortAscending: false },
        page: 0,
        // eslint-disable-next-line camelcase
        rows_per_page: 500, // there are 19 pools currently
      }),
    );
    return data.rows.map((pool): IUnicryptFarmEntryMinimal => {
      return {
        id: pool.spool_address,
        feature: this.meta.feature,
        chain: this.meta.chain,
        supply: {
          token: { address: pool.stoken_address },
          extra: {
            tvl: pool.tvl,
          },
        },
        rewarded: pool.meta.rewards.map((reward) => {
          return {
            token: { address: reward.address },
            extra: {
              apr: reward.apy / 100,
              rewardPool: reward.reward_pool_address,
            },
          };
        }),
      };
    });
  }

  /**
   * @override
   * Format supply token because TVL is supplied by the API
   */
  protected formatOpportunitySuppliedToken(
    supplied: IUnicryptFarmSupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    return {
      token,
      tvl: supplied.extra.tvl,
    };
  }

  /**
   * @override
   * Format reward token because apt is supplied by the API
   */
  protected formatOpportunityRewardedToken(
    reward: IUnicryptFarmRewardTokenMinimal,
    token: ERC20Token,
  ): IRewardTokenOpportunity {
    return {
      token,
      apr: { year: reward.extra.apr },
      apy: { year: reward.extra.apr },
    };
  }

  /**
   * Get User Balances
   */
  protected async fetchUserData(
    address: string,
    pools: IUnicryptFarmOpportunity[],
  ): Promise<IUnicryptFarmUserEntry[]> {
    const calls = new Map();
    pools.forEach((pool) => {
      const contract = new UnicryptStakePool(pool.id);

      calls.set(`${pool.id}-poolInfo`, contract.getPoolInfo());

      calls.set(`${pool.id}-${address}-userInfo`, contract.getUserInfo(address));
    });

    const results = await this.multicall.handleInBatches(calls, this.meta.chain);

    return pools.reduce((pools, pool) => {
      const userPool = this.formatUserData(address, pool, results);
      if (userPool) {
        pools.push(userPool);
      }

      return pools;
    }, []);
  }

  private formatUserData(
    address: Address,
    pool: IUnicryptFarmOpportunity,
    results: any,
  ): IUnicryptFarmUserEntry {
    const poolInfo = results.get(`${pool.id}-poolInfo`).output.data;
    const userInfo = results.get(`${pool.id}-${address}-userInfo`).output.data;

    if (!poolInfo || !userInfo) return;

    const supplyAmount = normalizeDecimals(userInfo.share_weight, pool.supply.token.decimals);

    if (!supplyAmount) return;

    return {
      ...pool,
      supply: {
        ...pool.supply,
        amount: supplyAmount,
        value: supplyAmount * pool.supply.token.price,
      },
      rewarded: [], // TODO: currently unable to find reward balances
      // rewarded: pool.rewarded.map((reward) => {
      //   return {
      //     ...reward,
      //     amount: null,
      //     value: null,
      //   };
      // }),
    };
  }
}
