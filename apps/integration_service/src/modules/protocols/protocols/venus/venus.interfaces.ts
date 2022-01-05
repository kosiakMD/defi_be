import { BigNumber } from '@ethersproject/bignumber';

export interface BalanceInfo {
  userAddress: string;
  vToken: string;
  vTokenBalance: BigNumber;
  token: string;
  tokenBalance: BigNumber;
  borrowBalance: BigNumber;
  vTokenStats: VTokenStats;
}

export interface VTokenStats {
  exchangeRate: BigNumber;
  supplyRate: BigNumber;
  borrowRate: BigNumber;
}

export interface APY {
  borrow: number;
  supply: number;
}
