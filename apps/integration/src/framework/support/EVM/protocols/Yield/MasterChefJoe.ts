import BigNumber from 'bignumber.js';
import { cloneDeep } from 'lodash';

import { Address } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';

import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { MasterChef } from './MasterChef';

export interface IMasterChefJoePoolInfo {
  poolId: number;
  stakedToken: Address;
  rewarder: Address;
  allocPoint: number;
}

export class MasterChefJoe extends MasterChef {
  rewarderPredicates: INamedFunctionPredicates = {
    rewardToken: () => (item) => item.name === 'rewardToken',
  };

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    // parse/format the supplied context data
    const poolIds = Array.from(Array(context.poolLength).keys());

    if (context.badPools && Array.isArray(context.badPools)) {
      // sort descending, and remove each from poolId queue
      context.badPools.sort((a, b) => (a > b ? -1 : 1)).forEach((id) => poolIds.splice(id, 1));
    }

    const poolInfos = await this.fetchPoolInfos(poolIds);
    const secondRewardTokens = await this.fetchSecondRewardToken(poolInfos);

    const totalStakedCalls = poolInfos.map((poolInfo) => {
      const lpContract = new ERC20(poolInfo.stakedToken);
      return lpContract.balanceOf(this.meta.address);
    });

    const totalStakedPerPool = await this.multicall.callArray(totalStakedCalls, this.meta.chain);

    return poolInfos.map((poolInfo, poolIdx) => {
      return this.formatOpportunityMinimal(
        poolInfo,
        secondRewardTokens,
        totalStakedPerPool[poolIdx].toString(), // totalStaked
        context,
      );
    });
  }

  protected async fetchSecondRewardToken(
    poolInfos: IMasterChefJoePoolInfo[],
  ): Promise<Record<string, any>[]> {
    const rewarderFunctions = await this.abiService.parseFunctionsFromAddress(
      poolInfos[0].rewarder,
      this.meta.chain,
      this.rewarderPredicates,
    );

    const calls = new Map();
    for (const { rewarder } of poolInfos) {
      if (rewarder === ZERO_ADDRESS) continue;
      const contract = new DynamicContract(rewarder);
      calls.set(rewarder, contract.createCall(rewarderFunctions.rewardToken));
    }

    const rewarderInfo = await this.multicall.handleInBatches(calls, this.meta.chain);

    const rewardedTokens = poolInfos.map(({ rewarder }, idx) => {
      if (!rewarderInfo.has(rewarder)) return;
      return {
        rewardToken: rewarderInfo.get(rewarder).output.data,
        poolId: idx,
      };
    });

    return rewardedTokens.filter(Boolean);
  }

  private formatOpportunityMinimal(
    poolInfo: IMasterChefJoePoolInfo,
    secondRewardTokens: { [key: string]: any }[],
    totalStaked: string,
    context: { [key: string]: any },
  ): IStakingFeatureMinimal {
    const rewardShare = poolInfo.allocPoint / context.totalAllocPoint;

    const rewardPerSecond = new BigNumber(context.rewardPerSecond) //
      .times(rewardShare) // percentage of total reward for this pool
      .toString();
    const secondRewardToken = secondRewardTokens.find((x) => x.poolId === poolInfo.poolId);
    const rewarded = [
      {
        token: { address: context.rewardToken },
        rewardPerSecond,
      },
    ];
    if (secondRewardToken) {
      rewarded.push({
        token: { address: secondRewardToken.rewardToken },
        rewardPerSecond: '0',
      });
    }
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
      rewarded: rewarded,
    };
  }

  protected formatPoolInfo(poolInfo: any[]): IMasterChefJoePoolInfo[] {
    // Get pool info outputs
    const poolInfoOutputs = this.functions.poolInfo.outputs;
    const lpTokenIdx = poolInfoOutputs.findIndex((output) => output.type === 'address');
    const allocPointIdx = poolInfoOutputs.findIndex((output) =>
      output.name.toLowerCase().startsWith('alloc'),
    );
    return poolInfo.map((pool) => ({
      poolId: pool.poolId,
      rewarder: pool.rewarder || Object.values(pool)[lpTokenIdx]?.toString().toLowerCase(),
      stakedToken: pool.stakedToken || Object.values(pool)[lpTokenIdx]?.toString().toLowerCase(),
      allocPoint: parseInt(Object.values(pool)[allocPointIdx].toString(), 10),
    }));
  }

  protected formatOpportunityInteractiveFunctions() {
    return [];
  }

  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const poolInfo = cloneDeep(pool);
    const [masterchef, poolId] = pool.id.split('::');

    const {
      output: { data: userInfo },
    } = data.get(this.userInfoLabel(masterchef, poolId, address));

    const balance = normalizeDecimals(
      userInfo[this.getUserInfoAmountKey()].toString(),
      poolInfo.supplied[0].token.decimals,
    );

    if (!balance) return;

    // Update supplied token
    poolInfo.supplied[0] = this.modifyUserEntrySupplied(poolInfo.supplied[0], balance);

    const {
      output: { data: pendingRewards },
    } = data.get(this.pendingRewardsLabel(masterchef, poolId, address));

    const rewardBalance = normalizeDecimals(
      pendingRewards[0].toString(),
      poolInfo.rewarded[0].token.decimals,
    );

    // Update Reward Token
    Object.assign(poolInfo.rewarded[0], {
      amount: rewardBalance,
      value: rewardBalance * poolInfo.rewarded[0].token.price,
    });

    return poolInfo as IStakingFeatureUserEntry;
  }
}
