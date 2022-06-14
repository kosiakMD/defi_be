import { IronFinanceAssetService } from 'apps/integration/src/modules/microservices/ironFinance.asset.service';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { UniswapV2Pair } from '@app/common/web3provider/contracts/UniswapV2Pair';
import { IronFinanceLpPairs } from '@app/common/web3provider/contracts/protocols/ironFinance/IronFinanceLpPairs';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { INamedFunctionPredicates } from '../../../interfaces';
import { IStakingFeatureMinimal } from '../../../interfaces/feature.staking.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { MasterChef } from './MasterChef';

export class IronFinanceStaking extends MasterChef {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: IronFinanceAssetService,
  ) {
    super(abiService, multicall, logger, cache, assetService);
  }

  functionPredicates: INamedFunctionPredicates = {
    poolInfo: () => (item) => item.name === 'poolInfo',
    lpToken: () => (item) => item.name === 'lpToken',
    poolLength: () => (item) => item.name === 'poolLength',
    pendingRewards: () => (item) => item.name === 'pendingReward',
    rewardToken: () => (item) => item.name === 'reward',
    userInfo: () => (item) => item.name === 'userInfo',
    totalAllocPoint: () => (item) => item.name === 'totalAllocPoint',
    rewardPerSecond: () => (item) => item.name === 'rewardPerSecond',
  };

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    const poolsList = await this.getPoolsList(context);

    const totalStakedCalls = poolsList.map((poolInfo) => {
      const lpContract = new ERC20(poolInfo.stakedToken);
      return lpContract.balanceOf(this.meta.address);
    });

    const totalStakedPerPool = await this.multicall.callArray(totalStakedCalls, this.meta.chain);

    return poolsList.map((pool: any, idx) => ({
      id: `${this.meta.address}::${idx}`,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: pool.stakedToken.toLowerCase(),
          },
          totalSupplied: totalStakedPerPool[idx].toString(),
        },
      ],
      rewarded: [
        {
          token: {
            address: context.rewardToken.toLowerCase(),
          },
          rewardPerSecond: pool.rewardPerSecond,
        },
      ],
    }));
  }

  protected async getPoolsList(context?: { [key: string]: any }) {
    const poolIds = Array.from(Array(context.allPoolsLength).keys());
    const poolsList = await this.fetchRegisteredPools(poolIds);
    return poolsList.map((poolInfo) => {
      const rewardShare = poolInfo.allocPoint / context.totalAllocPoint;

      poolInfo.rewardPerSecond = new BigNumber(context.rewardPerSecond)
        .times(rewardShare)
        .toString();
      return poolInfo;
    });
  }

  protected async fetchRegisteredPools(poolIds: number[]): Promise<
    {
      stakedToken: string;
      accRewardPerShare?: number;
      lastRewardTime?: number;
      allocPoint?: number;
      rewardPerSecond?: string;
    }[]
  > {
    const contract = this.getMainContract();

    const calls = new Map(
      poolIds.flatMap((poolId) => [
        [`${poolId} lpToken`, contract.createCall(this.functions.lpToken, poolId)],
        [`${poolId} poolInfo`, contract.createCall(this.functions.poolInfo, poolId)],
      ]),
    );
    const poolInfoCalls = await this.multicall.handleInBatches(calls, this.meta.chain);

    return poolIds.map((p) => ({
      stakedToken: poolInfoCalls.get(`${p} lpToken`)?.output.data,
      ...poolInfoCalls.get(`${p} poolInfo`)?.output.data,
    }));
  }

  protected getLpTokenContract(token: string): UniswapV2Pair {
    return new IronFinanceLpPairs(token);
  }
}
