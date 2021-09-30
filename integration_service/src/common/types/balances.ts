import { Address } from '.';
import { ChainIdEnum } from '../enum';

export interface Token {
  chainId: ChainIdEnum;
  name: string;
  address: Address;
  decimals: number;
  symbol: string;
  totalSupply?: number;
  isLp?: boolean;
}

export interface TokenBalance {
  amount: number;
  decimalsAmount: number;
  tokenPriceUSD: number;
  totalPriceUSD: number;
  token: Token;
}

export interface AccountBalanceBase {
  account: Address;
  totalUsd: number;
}

export interface AccountBalance extends AccountBalanceBase {
  tokens: TokenBalance[];
}

export type BalancesResponse = { [key: string]: AccountBalance };
