import { Address } from '@app/common';

import { INamedFunctionPredicates, IProtocolMeta } from '../../../interfaces';
import { LiquityStaking } from './LiquityStaking';

export interface ILiquityStabilityPoolMeta extends IProtocolMeta {
  address: Address;
  context: {
    rewardAToken: Address;
    rewardBToken: Address;
  };
}

export class LiquityStabilityPool extends LiquityStaking {
  /**
   * @notice only difference with LiquityStaking is that
   * both reward tokens are hardcoded in the meta context
   */
  protected functionPredicates: INamedFunctionPredicates = {
    stakedToken: () => (item) => item.name === 'lusdToken',
    totalStaked: () => (item) => item.name === 'getTotalLUSDDeposits',
    balance: () => (item) => item.name === 'getCompoundedLUSDDeposit',
    pendingRewardA: () => (item) => item.name === 'getDepositorLQTYGain',
    pendingRewardB: () => (item) => item.name === 'getDepositorETHGain',
  };
}
