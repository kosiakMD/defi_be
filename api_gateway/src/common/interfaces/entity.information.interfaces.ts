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

export class InformationTransaction {
  blockNumber: string;
  id: string;
  timestamp: string;
}

export class Pair {
  id: string;
  @Type(() => UniswapToken)
  token0: UniswapToken;
  @Type(() => UniswapToken)
  token1: UniswapToken;
}

export interface InformationSnapshot {
  block: number;
  liquidityTokenBalance: string;
  liquidityTokenTotalSupply: string;
  pair: {
    id: string;
  };
  reserve0: string;
  reserve1: string;
  reserveUSD: string;
  timestamp: number;
  token0PriceUSD: string;
  token1PriceUSD: string;
  user: {
    id: string;
  };
}

export class InformationSwap {
  amount0In: string;
  amount0Out: string;
  amount1In: string;
  amount1Out: string;
  amountUSD: string;
  from: string;
  logIndex: string;
  @Type(() => Pair)
  pair: Pair;
  sender: string;
  to: string;
  @Type(() => InformationTransaction)
  transaction: InformationTransaction;
}

export class InformationMint {
  amount0: string;
  amount1: string;
  amountUSD: string;
  liquidity: string;
  @Type(() => Pair)
  pair: Pair;
  sender: string;
  to: string;
  @Type(() => InformationTransaction)
  transaction: InformationTransaction;
}

export class InformationBurn {
  amount0: string;
  amount1: string;
  amountUSD: string;
  liquidity: string;
  @Type(() => Pair)
  pair: Pair;
  sender: string;
  to: string;
  @Type(() => InformationTransaction)
  transaction: InformationTransaction;
}

export interface BurnsInterface {
  id: number;
  blockNumber: number;
  createdAt: Date;
  information: InformationBurn;
  sender: string;
  toAddress: string;
}

export interface MintsInterface {
  id: number;
  blockNumber: number;
  createdAt: Date;
  information: InformationMint;
  sender: string;
  toAddress: string;
}

export interface SnapshotsInterface {
  id: number;
  userAddress: string;
  information: InformationSnapshot;
  blockNumber: number;
  createdAt: Date;
}

export interface SwapsInterface {
  id: number;
  blockNumber: number;
  createdAt: Date;
  information: InformationSwap;
  sender: string;
  toAddress: string;
  fromAddress: string;
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
