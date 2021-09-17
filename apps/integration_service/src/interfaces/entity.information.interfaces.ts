// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';

// eslint-disable-next-line max-classes-per-file
export class UniswapToken {
  decimals: string;
  id: string;
  name: string;
  symbol: string;
  percentage?: number;
}

export class Pair {
  id: string;
  @Type(() => UniswapToken)
  token0: UniswapToken;
  @Type(() => UniswapToken)
  token1: UniswapToken;
}

export interface PoolToken {
  address: string;
  decimals: number;
  name: string;
  symbol: string;
  totalSupply: any;
  reserve: string;
  amount: string;
  priceUSD: number;
  percentage: number;
}
