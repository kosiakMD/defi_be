export type Address = string;

export interface Base<T = string> {
  userAddress: string;
  protocolName: string;
  protocolType: T;
}

export interface ERC20Token {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: string;
}

export interface PoolTokenStaked extends ERC20Token, AmountAble {}

export interface PriceAbleToken extends ERC20Token, PriceAble {}

export interface PoolToken extends ERC20Token, PriceAble, AmountAble {
  reserve: string;
}

export interface PriceAble {
  priceUSD?: number;
}

export interface AmountAble {
  amount?: string;
}

export interface Transaction<T = string> {
  type: T;
  hash: string;
  timestamp: number;
  blockNumber: number;
  gasUsed?: number;
  gasPrice?: number;
  gasPriceUsd?: number;
}
