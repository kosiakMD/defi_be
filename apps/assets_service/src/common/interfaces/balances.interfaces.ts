import { Address } from '@app/common';

export interface ERC20Token {
  address: string;
  decimals?: number;
  symbol?: string;
  name?: string;
  chainId?: number;
}

export interface TokenBalance {
  amount: string;
  decimalsAmount?: number;
  tokenPrice?: number;
  totalPrice?: number;
  token: ERC20Token;
}

export interface ErrorMessage {
  chainId: number;
  statusCode: number;
  message: string;
}

export interface AccountBalance {
  account: Address;
  totalUsd: number;
  tokens: TokenBalance[];
  errors?: ErrorMessage[];
}

export type BalancesResponse = { [key: string]: AccountBalance };

export interface BlockTimestamp {
  date: Date;
  block: number;
  timestamp: number;
}
