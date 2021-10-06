import BigNumber from 'bignumber.js';

export interface RewardsData {
  poolId: number;
  pendingCake?: BigNumber;
  userAddress: string;
}
