import { Address } from '@app/common';
import { CallData } from '@app/common/dto/call-data';
import { DynamicContract } from '@app/common/web3provider/contracts/dynamic-contract';

import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
} from '../../../interfaces/feature.staking.interface';
import { StakingRewards } from './staking-rewards';

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
    const active =
      new Date(
        Number(
          data
            .get(this.callLabel(address, this.functions.periodFinish.name))
            .output.data.toString(),
        ) * 1000,
      ).getTime() > Date.now();

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
          rewardPerSecond: active
            ? data
                .get(this.callLabel(address, this.functions.rewardRateA.name))
                .output.data.toString()
            : '0',
        },
        {
          token: {
            address: data
              .get(this.callLabel(address, this.functions.rewardTokenB.name))
              .output.data.toLowerCase(),
          },
          rewardPerSecond: active
            ? data
                .get(this.callLabel(address, this.functions.rewardRateB.name))
                .output.data.toString()
            : '0',
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
