import { Address, ChainIdEnum } from '@app/common';

export interface ERC20Token {
  address: string;
  decimals?: number;
  symbol?: string;
  name?: string;
  chainId?: ChainIdEnum;
}

export interface TokenBalance {
  amount: string;
  decimalsAmount?: number;
  // TODO: This should be changed to price
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
  token: ERC20Token;
}

export interface ErrorMessage {
  chainId: number;
  statusCode: number;
  message: string;
}

export interface AccountBalance {
  account: Address;
  // TODO: This should be changed to total value
  totalUsd: number;
  tokens: TokenBalance[];
  errors?: ErrorMessage[];
}

export interface EthTokenBalance {
  [key: string]: ERC20Token;
}

export type BalancesResponse = { [key: string]: AccountBalance };

export type TokenPrices = { [key: string]: number };

export type TokenPricesV2 = { [key: string]: { price?: number; isLp?: boolean } };
