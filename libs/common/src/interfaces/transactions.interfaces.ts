// eslint-disable-next-line max-classes-per-file
import { IncomeLiquidityPosition } from '../dto';
import { ERC20Token } from '../dto/ERC20Token';
import {
  BurnsInterface,
  MintsInterface,
  SnapshotsInterface,
  SwapsInterface,
} from './index';
import { TokenSymbol } from '../types';

export interface AmountAble {
  amount?: string;
}

export interface PriceAble {
  priceUSD?: number;
}

export interface PoolToken extends ERC20Token, AmountAble, PriceAble {
  amount?: string;
  priceUSD?: number;
  reserve: string;
  percentage?: number;
}

export interface UniswapSubgraphLikeData {
  // TODO: rename to common
  uniswapSwapsFrom?: Map<string, SwapsInterface[]>;
  uniswapMints?: Map<string, MintsInterface[]>;
  uniswapBurns?: Map<string, BurnsInterface[]>;
  uniswapSnapshots?: Map<string, SnapshotsInterface[]>;
  subgraphPools: Map<string, IncomeLiquidityPosition[]>;
  subgraphStaking?: Map<string, any>;
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

export interface PlatformPoolToken {
  address: string;
  reserve: string;
  name: string;
  symbol: TokenSymbol;
  percentage: number;
  decimals: number;
  totalSupply: string;
  priceUSD?: number;
  // TODO should be required
  amount?: string;
}
