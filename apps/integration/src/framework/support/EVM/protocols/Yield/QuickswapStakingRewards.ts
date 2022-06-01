import { Address } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { endsWith, startsWith } from '@app/common/utils';

import { INamedFunctionPredicates } from '../../../interfaces';
import { IStakingFeatureMinimal } from '../../../interfaces/feature.staking.interface';
import { StakingRewards } from './StakingRewards';

export class QuickswapStakingRewards extends StakingRewards {
  protected functionPredicates: INamedFunctionPredicates = {
    periodFinish: () => (item) => item.name === 'periodFinish',
    balanceOf: () => (item) => ['balanceOf', 'userInfo'].includes(item.name),
    earned: () => (item) => ['pendingReward', 'earned'].includes(item.name),
    stakingToken: () => (item) => startsWith(item.name, 'stak') && endsWith(item.name, 'token'),
    rewardToken: () => (item) => ['rewardToken', 'rewardsToken'].includes(item.name),
    rewardPerSecond: () => (item) => ['rewardRate', 'rewardPerBlock'].includes(item.name),
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

    const opportunity = {
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
              .get(this.callLabel(address, this.functions.rewardToken.name))
              .output.data.toLowerCase(),
          },
          rewardPerSecond: active
            ? data
                .get(this.callLabel(address, this.functions.rewardPerSecond.name))
                .output.data.toString()
            : '0',
        },
      ],
    };

    return opportunity;
  }
}
