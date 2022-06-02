import BigNumber from 'bignumber.js';

export interface BalanceInfo {
  userAddress: string;
  pToken: string;
  pTokenBalance: BigNumber;
  token: string;
  tokenBalance: BigNumber;
  borrowBalance: BigNumber;
  pTokenStats: PTokenStats;
}

export interface PTokenStats {
  exchangeRate: BigNumber;
  supplyRate: BigNumber;
  borrowRate: BigNumber;
}

export interface APY {
  borrow: number;
  supply: number;
}
