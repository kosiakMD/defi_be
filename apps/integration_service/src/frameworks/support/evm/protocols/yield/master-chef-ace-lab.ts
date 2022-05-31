import { Address } from '@app/common';
import { equals } from '@app/common/utils';

import { IFunctionPredicate } from '../../../interfaces';
import { IStakingFeatureMinimal } from '../../../interfaces/feature-staking.interface';
import { MasterChef } from './master-chef';

type RequiredKeys<T = IFunctionPredicate> = {
  [key in 'poolLength' | 'depositToken' | 'poolInfo' | 'userInfo' | 'pendingRewards']: T;
};

interface IContext {
  poolLength: number;
  depositToken: Address;
  badPools?: number[]; // poolIds to skip
}

/**
 * 'Flipped' masterchef. deposit the same token into
 * every pool, but get a different reward from each
 */
export class MasterChefAceLab extends MasterChef {
  protected updateFunctionPredicates(): void {
    // reward token info is inside of poolInfo for ace lab
    delete this.functionPredicates.rewardPerSecond;
    delete this.functionPredicates.rewardToken;
    delete this.functionPredicates.totalAllocPoint;

    // xBoo is the only deposit token for all pools (rewards are different per pool)
    this.functionPredicates.depositToken = () => (item) => equals(item.name, 'xboo');
  }

  protected formatContext(context: RequiredKeys<any>): IContext {
    context.poolLength = parseInt(context.poolLength, 10);
    return context;
  }

  protected async fetchOpportunityData(context: IContext): Promise<IStakingFeatureMinimal[]> {
    const poolIds = Array.from(Array(context.poolLength).keys());
    if (context.badPools && Array.isArray(context.badPools)) {
      context.badPools.sort((a, b) => (a > b ? -1 : 1)).forEach((id) => poolIds.splice(id, 1));
    }

    const poolInfos = await this.fetchPoolInfos(poolIds);

    return poolInfos.map((poolInfo, poolId): IStakingFeatureMinimal => {
      return {
        id: `${this.meta.address}::${poolId}`,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: { address: context.depositToken.toLowerCase() },
            totalSupplied: poolInfo.totalStaked,
          },
        ],
        rewarded: [
          {
            token: { address: poolInfo.rewardToken },
            rewardPerSecond: poolInfo.rewardPerSecond,
          },
        ],
      };
    });
  }

  protected formatPoolInfo(poolInfo: any[]): any[] {
    // Get pool info output indexes
    const rewardTokenIdx = this.functions.poolInfo.outputs.findIndex(
      (output) => output.type === 'address',
    );
    const rewardPerSecondIdx = this.functions.poolInfo.outputs.findIndex(
      (output) => output.name === 'RewardPerSecond',
    );

    return poolInfo.map((pool) => {
      const now = new Date().getTime();
      const hasEnded = new Date(pool.endTime.toNumber() * 1000).getTime() < now;
      const hasStarted = new Date(pool.startTime.toNumber() * 1000).getTime() < now;
      const isActive = hasStarted && !hasEnded;

      return {
        rewardToken: Object.values(pool)[rewardTokenIdx].toString().toLowerCase(),
        rewardPerSecond: isActive ? Object.values(pool)[rewardPerSecondIdx].toString() : '0',
        totalStaked: pool.xBooStakedAmount.toString(),
      };
    });
  }
}
