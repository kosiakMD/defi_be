// to be removed once transition to v2 will be completed
import BigNumber from 'bignumber.js';

export interface RewardsData {
  poolId: number;
  pendingCake?: BigNumber;
  userAddress: string;
}
