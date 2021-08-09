import { ChainId } from '../../common/types';

export interface Token {
  chainId: ChainId;
  name: string;
  address: string;
  decimals: number;
  symbol: number;
}

export interface BalanceToken {
  amount: number;
  decimalsAmount: number;
  tokenPriceUSD: number;
  totalPriceUSD: number;
  token: Token;
}

export interface BalancesResponse {
  [address: string]: {
    totalUsd: number;
    tokens: BalanceToken[];
  };
}
