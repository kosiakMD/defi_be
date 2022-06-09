import { INamedFunctionPredicates } from '../../../interfaces';
import { IStakingFeatureMinimal } from '../../../interfaces/feature.staking.interface';
import { MasterChef } from './MasterChef';

export class KyberStaking extends MasterChef {
  functionPredicates: INamedFunctionPredicates = {
    poolInfo: () => (item) => item.name === 'getPoolInfo',
    poolLength: () => (item) => item.name === 'poolLength',
    pendingRewards: () => (item) => item.name === 'pendingRewards',
    getRewardTokens: () => (item) => item.name === 'getRewardTokens',
    rewardToken: () => (item) => item.name === 'rewardTokens',
    userInfo: () => (item) => item.name === 'getUserInfo',
  };

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    const poolIds = Array.from(Array(context.poolLength).keys());
    const poolsList = await this.fetchRegisteredPools(poolIds);

    const rewardTokensListCalls = poolIds.map((poolId) =>
      this.getMainContract().createCall(this.functions.rewardToken, poolId),
    );
    const rewardTokensList = await this.multicall.callArray(rewardTokensListCalls, this.meta.chain);

    return Array.from(poolsList.values()).map((pool: any, idx) => ({
      id: `${this.meta.address}::${idx}`,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: pool.stakeToken.toLowerCase(),
          },
          totalSupplied: pool.totalStake.toString(),
        },
      ],
      rewarded: [
        {
          token: {
            address: rewardTokensList[idx].toLowerCase(),
          },
        },
      ],
    }));
  }

  protected async fetchRegisteredPools(
    poolIds: number[],
  ): Promise<Map<string, { totalStake: number; stakeToken: string }>> {
    const registeredPoolsCalls = poolIds.map((poolId) =>
      this.getMainContract().createCall(this.functions.poolInfo, poolId),
    );
    const registeredPools = await this.multicall.callArray(registeredPoolsCalls, this.meta.chain);
    return new Map(registeredPools.map((t) => [t.stakeToken.toLowerCase(), t]));
  }
}
