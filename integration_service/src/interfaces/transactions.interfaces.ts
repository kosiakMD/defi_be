import {
  BurnsInterface,
  MintsInterface,
  SnapshotsInterface,
  SwapsInterface,
} from './entity.information.interfaces';
import { LiquidityPosition, UniswapLiquidityPosition } from './liquidity.position.interfaces';
import {
  ChainIdEnum,
  LiquidityChangeTypeEnum,
  PlatformEnum,
  ProtocolName,
  ProtocolTypeEnum,
  TransactionTypeEnum,
} from 'src/common/enum';

export type Address = string;

export type TokenSymbol = string;

export interface PriceAble {
  priceUSD?: number;
}

export interface AmountAble {
  amount?: string;
}

export interface ERC20Token {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: string;
}

export interface PoolToken extends ERC20Token, PriceAble, AmountAble {
  reserve: string;
  percentage?: number;
}

export interface UniswapResponseData {
  uniswapSwapsFrom?: Map<string, SwapsInterface[]>;
  uniswapMints?: Map<string, MintsInterface[]>;
  uniswapBurns?: Map<string, BurnsInterface[]>;
  uniswapSnapshots?: Map<string, SnapshotsInterface[]>;
  uniswapLiquidityPositions: Map<string, UniswapLiquidityPosition[]>;
  sushiswapStakingPosition?: Map<string, any>;
}

export interface ClaimAbleToken extends ERC20Token {
  claimed?: string;
  claimable: string;
  priceUSD?: number;
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

export interface BaseData<T = keyof typeof ProtocolTypeEnum> {
  chainId: ChainIdEnum;
  userAddress: string;
  protocolType: T;
  platformName: PlatformEnum;
  protocolName?: ProtocolName;
}

export interface StakeTransaction extends Transaction<TransactionTypeEnum.stake> {
  amount: number;
}

export interface Transactions extends BaseData<ProtocolTypeEnum.transaction> {
  txs: Transaction[];
}

export interface UnStakeTransaction extends Transaction<TransactionTypeEnum.unStake> {
  amount: number;
}

export interface ClaimTransaction extends Transaction<TransactionTypeEnum.claim> {
  amount: number;
}

type StakingTransaction = StakeTransaction | UnStakeTransaction | ClaimTransaction;

export interface StakingPosition {
  address: string;
  poolId?: string;
  staked: string;
  lpToken: ERC20Token;
  rewardToken: ClaimAbleToken;
  liquidityPoolTokens: PoolToken[];
  transactions?: StakingTransaction[];
}

export interface BaseData<T = keyof typeof ProtocolTypeEnum> {
  chainId: ChainIdEnum;
  userAddress: string;
  protocolType: T;
  platformName: PlatformEnum;
  protocolName?: ProtocolName;
}

export interface SwapToken extends ERC20Token, AmountAble, PriceAble {}

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

export interface txs {
  type: LiquidityChangeTypeEnum;
  hash: Address;
  blockNumber: number;
  timestamp: number;
  liquidity: string;
  amountUSD: number;
  gasPrice: number;
  gasPriceUsd: number;
  gasUsed: number;
  lpTokenAddress: Address;
  tokens: PlatformPoolToken[];
}
