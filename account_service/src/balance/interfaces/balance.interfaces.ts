import { Address } from '../../interfaces';
import { ERC20Token } from '../../transfers/interfaces/transfers.interfaces';

export interface Balance {
  account: Address;
  totalUsd: number;
}

export interface BalanceToken {
  chainId: number;
  decimals: number;
  symbol: string;
  name: string;
  address: string;
}

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
  token: ERC20Token | BalanceToken;
}

export interface AccountTokenBalance extends TokenBalance {
  account: string;
}

export interface AccountBalance {
  account: string;
  totalUsd: number;
  tokens: AccountTokenBalance[];
}

export type BalancesResponse = { [key: string]: AccountBalance };

export type TokenPrices = { [key: string]: number };
