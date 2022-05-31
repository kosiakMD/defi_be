import BigNumber from 'bignumber.js';

export interface BalanceInfo {
  userAddress: string;
  jToken: string;
  jTokenBalance: BigNumber;
  token: string;
  tokenBalance: BigNumber;
  borrowBalance: BigNumber;
  jTokenStats: JTokenStats;
}

export interface JTokenStats {
  exchangeRate: BigNumber;
  supplyRate: BigNumber;
  borrowRate: BigNumber;
}

export interface APY {
  borrow: number;
  supply: number;
}
