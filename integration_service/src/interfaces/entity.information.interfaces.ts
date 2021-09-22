// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';

// eslint-disable-next-line max-classes-per-file
export class IncomeToken {
  decimals: string;
  id: string;
  name: string;
  symbol: string;
  percentage?: number;
}

export class Pair {
  id: string;
  @Type(() => IncomeToken)
  token0: IncomeToken;
  @Type(() => IncomeToken)
  token1: IncomeToken;
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
