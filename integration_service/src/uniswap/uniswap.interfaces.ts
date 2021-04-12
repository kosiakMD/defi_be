import { UniswapBurnsEntity } from './entities/uniswap.burns.entity';
import { UniswapMintsEntity } from './entities/uniswap.mints.entity';
import { UniswapSnapshotsEntity } from './entities/uniswap.snapshots.entity';
import { UniswapSwapsEntity } from './entities/uniswap.swaps.entity';
import {
  LiquidityPosition,
  UniswapLiquidityPosition,
} from './interfaces/liquidity.position.interfaces';

export interface UniswapResponseData {
  uniswapSwapsFrom: Map<string, UniswapSwapsEntity[]>;
  uniswapMints: Map<string, UniswapMintsEntity[]>;
  uniswapBurns: Map<string, UniswapBurnsEntity[]>;
  uniswapSnapshots: Map<string, UniswapSnapshotsEntity[]>;
  uniswapLiquidityPositions: Map<string, UniswapLiquidityPosition[]>;
}

export interface Base<T = string> {
  userAddress: string;
  protocolName: string;
  protocolType: T;
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

export interface Transactions extends Base<'transaction'> {
  txs: Transaction[];
}

export interface ERC20Token {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: string;
}

export interface PriceAble {
  priceUSD?: number;
}

export interface AmountAble {
  amount?: string;
}

export interface SwapToken extends ERC20Token, AmountAble, PriceAble {}

export interface PoolToken extends ERC20Token, PriceAble, AmountAble {
  reserve: string;
  percentage?: number;
}

export interface LiquidityChangeTransaction extends Transaction {
  type: 'addLiquidity' | 'removeLiquidity';
  lpTokenAddress: string;
  liquidity: string;
  amountUSD?: number;
  tokens: PoolToken[];
}

export interface SwapTransaction extends Transaction {
  type: 'swap';
  tokenIn: SwapToken;
  tokenOut: SwapToken;
}

//TODO: interfaces for liquidityPositions that were obtained from uniswapSnapshot

// export interface LiquidityTest {
// 	id: string;
// 	balance: string;
// 	earnedFeeUSD?: number;
// 	exitedAt: number;
// }

// export interface AutomaticMarketMakerTest extends Base<'amm'> {
// 	isTransferSupported?: boolean;
// 	liquidityPositions: LiquidityTest[];
// }

export interface AutomaticMarketMaker extends Base<'amm'> {
  isTransferSupported?: boolean;
  liquidityPositions: LiquidityPosition[];
}
