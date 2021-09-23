// eslint-disable-next-line max-classes-per-file
import { AaveUser, IncomeLiquidityPosition } from '@app/common/dto';
import { ERC20Token } from '@app/common/dto/transactions.dto';
import {
  BurnsInterface,
  MintsInterface,
  SnapshotsInterface,
  SwapsInterface,
} from '@app/common/interfaces/index';
import { TokenSymbol } from '@app/common/types';

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

export interface SwapToken extends ERC20Token, AmountAble, PriceAble {}

export interface UniswapResponseData {
  uniswapSwapsFrom?: Map<string, SwapsInterface[]>;
  uniswapMints?: Map<string, MintsInterface[]>;
  uniswapBurns?: Map<string, BurnsInterface[]>;
  uniswapSnapshots?: Map<string, SnapshotsInterface[]>;
  uniswapLiquidityPositions: Map<string, IncomeLiquidityPosition[]>;
  sushiswapStakingPosition?: Map<string, any>;
  aaveLendingPositions?: Map<string, AaveUser>;
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
  name?: string;
  symbol?: TokenSymbol;
  percentage?: number;
  decimals?: number;
  totalSupply?: string;
  priceUSD?: number;
  amount?: string;
}
