import { plainToClass } from 'class-transformer';
import { equals } from 'class-validator';
import { startsWith } from 'lodash';

import { averageBlockTimeByChain } from '@app/common/constant/blocktime';
import { CallData } from '@app/common/dto/call-data';
import { dataFrom } from '@app/common/utils';

import { INamedFunctionPredicates } from '../../../interfaces';
import { IStakingFeatureMinimal } from '../../../interfaces/feature-staking.interface';
import { MasterChef } from './master-chef';

export class MasterChefPancakeV2 extends MasterChef {
  functionPredicates: INamedFunctionPredicates = {
    poolLength: () => (item) => startsWith(item.name, 'poolLen'),
    // first try to get an TOKEN per (block/second) item
    rewardPerBlock: () => (item) => equals(item.name, 'cakePerBlock'),
    lpToken: () => (item) => equals(item.name, 'lpToken'),
    // then use the above ABI item, to parse out the probable TOKEN name
    rewardToken: () => (item) => equals(item.name, 'CAKE'),
    totalRegularAllocPoint: () => (item) => equals(item.name, 'totalRegularAllocPoint'),
    totalSpecialAllocPoint: () => (item) => equals(item.name, 'totalSpecialAllocPoint'),
    poolInfo: () => (item) => startsWith(item.name, 'poolInf'),
    userInfo: () => (item) => startsWith(item.name, 'userInf'),
    pendingRewards: () => (item) => equals(item.name, 'pendingCake'),
  };

  protected formatContext(context: { [key: string]: any }) {
    context.poolLength = context.poolLength.toNumber();
    context.rewardToken = context.rewardToken.toLowerCase();
    context.totalRegularAllocPoint = context.totalRegularAllocPoint.toNumber();
    context.totalSpecialAllocPoint = context.totalSpecialAllocPoint.toNumber();
    return context;
  }

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    // parse/format the supplied context data
    const poolIds = Array.from(Array(context.poolLength).keys());

    if (context.badPools && Array.isArray(context.badPools)) {
      // sort descending, and remove each from poolId queue
      context.badPools.sort((a, b) => (a > b ? -1 : 1)).forEach((id) => poolIds.splice(id, 1));
    }

    const poolInfos: IMasterChefPoolInfo[] = await this.fetchPoolInfos(poolIds);
    const avgBlockTime = averageBlockTimeByChain[this.meta.chain] || 1;

    return poolInfos.map((poolInfo) => {
      const totalAllocPoint = poolInfo.isRegular
        ? context.totalRegularAllocPoint
        : context.totalSpecialAllocPoint;
      const rewardShare = poolInfo.allocPoint / totalAllocPoint;
      const rewardPerSecond = (poolInfo.rewardPerBlock / avgBlockTime) * rewardShare;
      return {
        id: `${this.meta.address}::${poolInfo.poolId}`,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: {
              address: poolInfo.stakedToken,
            },
            totalSupplied: poolInfo.totalStaked.toString(),
          },
        ],
        rewarded: [
          {
            token: { address: context.rewardToken },
            rewardPerSecond: rewardPerSecond.toString(),
          },
        ],
        interactive: this.formatOpportunityInteractiveFunctions(poolInfo),
      };
    });
  }

  protected async fetchPoolInfos(poolIds: number[]): Promise<any[]> {
    const calls: Map<string, CallData> = new Map<string, CallData>();
    poolIds.forEach((poolId) => {
      calls.set(
        this.getPoolInfoLabel(this.meta.address, poolId),
        plainToClass(CallData, {
          address: this.meta.address,
          abi: this.functions.poolInfo,
          input: {
            data: [poolId],
          },
        }),
      );
      calls.set(
        this.getLpTokenLabel(this.meta.address, poolId),
        plainToClass(CallData, {
          address: this.meta.address,
          abi: this.functions.lpToken,
          input: {
            data: [poolId],
          },
        }),
      );
    });
    [true, false].forEach((boolValue) => {
      calls.set(
        this.getRewardPerBlockLabel(this.meta.address, boolValue),
        plainToClass(CallData, {
          address: this.meta.address,
          abi: this.functions.rewardPerBlock,
          input: {
            data: [boolValue],
          },
        }),
      );
    });
    const callsResult: Map<string, CallData> = await this.multicall.handleInBatches(
      calls,
      this.meta.chain,
    );

    return poolIds.map((poolId) => {
      const poolInfo = dataFrom(callsResult, this.getPoolInfoLabel(this.meta.address, poolId));
      const lpToken = dataFrom(callsResult, this.getLpTokenLabel(this.meta.address, poolId));
      const rewardPerBlock = dataFrom(
        callsResult,
        this.getRewardPerBlockLabel(this.meta.address, poolInfo.isRegular),
      );
      return {
        allocPoint: poolInfo.allocPoint.toNumber(),
        totalStaked: poolInfo.totalBoostedShare.toNumber(),
        isRegular: poolInfo.isRegular,
        poolId: poolId,
        stakedToken: lpToken.toLowerCase(),
        rewardPerBlock: rewardPerBlock.toNumber(),
      };
    });
  }

  getPoolInfoLabel(address, poolId: number) {
    return `${address}_poolInfo(${poolId})`;
  }

  getLpTokenLabel(address, poolId: number) {
    return `${address}_lpToken(${poolId})`;
  }

  getRewardPerBlockLabel(address, isRegular: boolean) {
    return `${address}_rewardPerBlock(${isRegular})`;
  }
}

export interface IMasterChefPoolInfo {
  allocPoint: number;
  totalStaked: number;
  isRegular: boolean;
  poolId: number;
  stakedToken: string;
  rewardPerBlock: number;
}
