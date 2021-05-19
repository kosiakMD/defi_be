import { BigNumber } from 'bignumber.js';

export interface PoolInfo {
  lpToken: string;
  allocPoint: BigNumber;
  lastRewardBlock: BigNumber;
  accCakePerShare: BigNumber;
}
