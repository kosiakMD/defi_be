import { ERC20Token } from '../common/interfaces';

export interface TokenBalance {
  amount: string;
  decimalsAmount: number;
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
  token: ERC20Token;
}

export interface AccountTokenBalance extends TokenBalance {
  account: string;
}

export interface Balance {
  totalUsd: number;
}

export interface BalanceToken {
  chainId: number;
  decimals: number;
  symbol: string;
  name: string;
  address: string;
  isLp?: boolean;
}
