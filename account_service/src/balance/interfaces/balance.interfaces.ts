import { ERC20Token } from '../../transfers/interfaces/transfers.interfaces';

export interface TokenRow {
  address: string;
  amount: string;
  tokenAddress: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimals?: string;
  tokenTotalSupply?: string;
}

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
  chainId: number;
  account: string;
  totalUsd: number;
  tokens: TokenBalance[];
}

export type BalancesResponse = { [key: string]: AccountBalance };

export interface AllBalancesResponse {
  bscBalance: BalancesResponse;
  balance: BalancesResponse;
}

export type TokenPrices = { [key: string]: number };
