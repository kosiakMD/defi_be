import { Address } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';

import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
} from '../../../interfaces/feature.staking.interface';
import { StakingRewards } from './StakingRewards';

export class StakingDualRewards extends StakingRewards {
  protected functionPredicates: INamedFunctionPredicates = {
    stakingToken: () => (item) => item.name === 'stakingToken',
    balanceOf: () => (item) => item.name === 'balanceOf',
    periodFinish: () => (item) => item.name === 'periodFinish',

    rewardTokenA: () => (item) => item.name === 'rewardsTokenA',
    earnedA: () => (item) => item.name === 'earnedA',
    rewardRateA: () => (item) => item.name === 'rewardRateA',

    rewardTokenB: () => (item) => item.name === 'rewardsTokenB',
    earnedB: () => (item) => item.name === 'earnedB',
    rewardRateB: () => (item) => item.name === 'rewardRateB',
  };

  protected formatStakingOpportunityMinimal(
    address: Address,
    data: Map<string, CallData>,
  ): IStakingFeatureMinimal {
    return {
      id: address,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: data
              .get(this.callLabel(address, this.functions.stakingToken.name))
              .output.data.toLowerCase(),
          },
          totalSupplied: data.get(this.callLabel(address, 'totalStaked')).output.data.toString(),
        },
      ],
      rewarded: [
        {
          token: {
            address: data
              .get(this.callLabel(address, this.functions.rewardTokenA.name))
              .output.data.toLowerCase(),
          },
          rewardPerSecond: data
            .get(this.callLabel(address, this.functions.rewardRateA.name))
            .output.data.toString(),
        },
        {
          token: {
            address: data
              .get(this.callLabel(address, this.functions.rewardTokenB.name))
              .output.data.toLowerCase(),
          },
          rewardPerSecond: data
            .get(this.callLabel(address, this.functions.rewardRateB.name))
            .output.data.toString(),
        },
      ],
    };
  }

  protected async fetchUserData(
    addresses: string[],
    pools: IStakingFeatureOpportunity[],
  ): Promise<any> {
    // Loop and get all user balances for all pools
    // TODO: Benchmark all calls at once, or userInfo once,
    // then pendingRewards for only the required pools
    const calls = new Map();
    addresses.forEach((address) => {
      return pools.forEach((pool) => {
        const contract = new DynamicContract(pool.id);
        calls.set(
          this.balanceOfLabel(pool.id, address),
          contract.createCall(this.functions.balanceOf, address),
        );
        calls.set(
          this.earnedLabel(pool.id, pool.rewarded[0].token.address, address),
          contract.createCall(this.functions.earnedA, address),
        );
        calls.set(
          this.earnedLabel(pool.id, pool.rewarded[1].token.address, address),
          contract.createCall(this.functions.earnedB, address),
        );
      });
    });

    return this.multicall.handleInBatches(calls, this.meta.chain);
  }
}
