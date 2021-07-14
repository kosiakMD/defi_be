import { ERC20Token } from '../../transfers/interfaces/transfers.interfaces';

export interface Balance {
  totalUsd: number;
}

export interface BalanceToken {
  chainId?: number;
  decimals: number;
  symbol: string;
  name: string;
  address: string;
  isLp?: boolean;
}

export interface TokenRow {
  address: string;
  amount: string;
  tokenAddress: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimals?: string;
  tokenTotalSupply?: string;
  isLp?: boolean;
}

export interface TokenBalance {
  amount: string;
  decimalsAmount: number;
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
  token: ERC20Token | BalanceToken;
}

export interface DbTokenPrice {
  address: string;
  price: number;
}

export interface Web3TokenBalance {
  account: string;
  amount: string;
}

export interface TokenPriceInterface {
  address: string;
}

export interface AccountTokenBalance extends TokenBalance {
  account: string;
}

export interface AccountBalance {
  totalUsd: number;
  tokens: AccountTokenBalance[];
}

export interface EthTokenBalance {
  [key: string]: BalanceToken;
}

export type BalancesResponse = { [key: string]: AccountBalance };

export type TokenPrices = { [key: string]: number };

export type NoDbTokenBalances = { [key: string]: number };
