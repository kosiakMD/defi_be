import { Address, ERC20Token } from './common';

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

export interface AccountBalance {
  account: Address;
  totalUsd: number;
  tokens: TokenBalance[];
}

export interface LiquidityPool {
  id: string;
  projectName: string;
  reserveUSD: number; // TODO: disable it
  reserveCurrency: number;
  currency: string;
  fee24h: number;
  APY: {
    day: number;
    week: number;
    month: number;
  };
  IL: {
    day: number;
    dayUSD: number;
    week: number;
    weekUSD: number;
    month: number;
    monthUSD: number;
  };
  tokens: {
    name: string;
    percentage: number;
  }[];
}

export type BalancesResponse = { [key: string]: AccountBalance };
