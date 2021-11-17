import BigNumber from 'bignumber.js';

export interface RewardsData {
  poolId: number;
  pendingJoe?: BigNumber;
  userAddress: string;
  pendingBonusToken?: BigNumber;
  bonusTokenAddress?: string;
}
