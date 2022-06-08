import BigNumber from 'bignumber.js';

import { INamedFunctionPredicates } from '../../../interfaces';
import { IStakingFeatureMinimal } from '../../../interfaces/feature.staking.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../../../interfaces/tokens.supplied.interface';
import { IMasterChefPoolInfo, MasterChef } from './MasterChef';

export class SynapseStaking extends MasterChef {
  functionPredicates: INamedFunctionPredicates = {
    lpToken: () => (item) => item.name === 'lpToken',
    poolInfo: () => (item) => item.name === 'poolInfo',
    pendingRewards: () => (item) => item.name === 'pendingSynapse',
    poolLength: () => (item) => item.name === 'poolLength',
    rewardPerSecond: () => (item) => item.name === 'synapsePerSecond',
    userInfo: () => (item) => item.name === 'userInfo',
    totalAllocPoint: () => (item) => item.name === 'totalAllocPoint',
  };

  protected async fetchPoolInfos(poolIds: number[]): Promise<any[]> {
    const contract = this.getMainContract();

    const lpTokensCalls = [];
    const poolInfoCalls = poolIds.map((poolId) => {
      lpTokensCalls.push(contract.createCall(this.functions.lpToken, poolId));
      return contract.createCall(this.functions.poolInfo, poolId);
    });

    const [poolInfo, lpTokens] = await Promise.all([
      this.multicall.callArray(poolInfoCalls, this.meta.chain),
      this.multicall.callArray(lpTokensCalls, this.meta.chain),
    ]);

    return this.formatPoolInfo(
      poolInfo.map((poolInfo, idx) => {
        poolInfo.poolId = poolIds[idx];
        poolInfo.stakedToken = lpTokens[idx].toLowerCase();
        return poolInfo;
      }),
    );
  }

  protected formatOpportunitySuppliedToken(
    poolToken: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    let tvl = 0;
    const poolShare = new BigNumber(poolToken.totalSupplied)
      .div(10 ** token.decimals)
      .div(token.totalSupply)
      .toNumber();
    token.underlying?.forEach((underlying) => {
      underlying.value = underlying.reserve * poolShare * underlying.price;
      tvl += underlying.value;
    });

    return {
      token,
      totalSupplied: +poolToken.totalSupplied,
      tvl: tvl || null,
    };
  }

  protected formatStakingOpportunityMinimal(
    poolInfo: IMasterChefPoolInfo,
    totalStaked: string,
    context: { [key: string]: any },
  ): IStakingFeatureMinimal {
    const rewardShare = poolInfo.allocPoint / context.totalAllocPoint;

    const rewardPerSecond = new BigNumber(context.rewardPerSecond) //
      .times(rewardShare) // percentage of total reward for this pool
      .toString();

    return {
      id: `${this.meta.address}::${poolInfo.poolId}`,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: poolInfo.stakedToken,
          },
          totalSupplied: totalStaked,
        },
      ],
      rewarded: [
        {
          token: { address: context.rewardToken },
          rewardPerSecond,
        },
      ],
    };
  }
}
