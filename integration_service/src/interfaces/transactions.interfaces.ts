import {
  ChainIdEnum,
  LiquidityChangeTypeEnum,
  PlatformEnum,
  ProtocolName,
  ProtocolTypeEnum,
  TransactionTypeEnum,
} from '../common/enum';
import {
  BurnsInterface,
  MintsInterface,
  SnapshotsInterface,
  SwapsInterface,
} from './entity.information.interfaces';
import { LiquidityPosition, UniswapLiquidityPosition } from './liquidity.position.interfaces';

export interface UniswapResponseData {
  uniswapSwapsFrom?: Map<string, SwapsInterface[]>;
  uniswapMints?: Map<string, MintsInterface[]>;
  uniswapBurns?: Map<string, BurnsInterface[]>;
  uniswapSnapshots?: Map<string, SnapshotsInterface[]>;
  uniswapLiquidityPositions: Map<string, UniswapLiquidityPosition[]>;
  sushiswapStakingPosition?: Map<string, any>;
}

export interface BaseData<T = keyof typeof ProtocolTypeEnum> {
  chainId: ChainIdEnum;
  userAddress: string;
  protocolType: T;
  platformName: PlatformEnum;
  protocolName?: ProtocolName;
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

export interface Transactions extends BaseData<ProtocolTypeEnum.transaction> {
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
  type: LiquidityChangeTypeEnum;
  lpTokenAddress: string;
  liquidity: string;
  amountUSD?: number;
  tokens: PoolToken[];
}

export interface SwapTransaction extends Transaction {
  type: TransactionTypeEnum.swap;
  tokenIn: SwapToken;
  tokenOut: SwapToken;
}

export interface AutomaticMarketMaker extends BaseData<ProtocolTypeEnum.amm> {
  isTransferSupported?: boolean;
  liquidityPositions: LiquidityPosition[];
}
