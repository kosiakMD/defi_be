// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';

import { Address } from '../common/types';
import {
  ChainIdEnum,
  LiquidityChangeTypeEnum,
  ProjectEnum,
  ProtocolName,
  ProtocolTypeEnum,
  TransactionTypeEnum,
} from 'src/common/enum';

import { LiquidityPosition, UniswapLiquidityPosition } from '../dto/liquidity.position.dto';
import {
  BurnsInterface,
  MintsInterface,
  SnapshotsInterface,
  SwapsInterface,
} from './entity.information.interfaces';

export type TokenSymbol = string;

export interface PriceAble {
  priceUSD?: number;
}

export interface AmountAble {
  amount?: string;
}

export class ERC20Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
}

export interface PoolToken extends ERC20Token, AmountAble, PriceAble {
  reserve: string;
  percentage?: number;
}

export interface Asset extends ERC20Token {
  id: number;
  chainId: number;
  isTracked: boolean;
}

export class PoolTokenDto extends ERC20Token implements PoolToken {
  reserve: string;
  percentage?: number;
  priceUSD?: number;
  amount?: string;
}

export interface SwapToken extends ERC20Token, AmountAble, PriceAble {}

export class SwapTokenDto extends ERC20Token implements SwapToken {
  priceUSD?: number;
  amount?: string;
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

export interface StakeTransaction extends Transaction<TransactionTypeEnum.stake> {
  amount: number;
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

export class BaseData<T = keyof typeof ProtocolTypeEnum> {
  chainId: ChainIdEnum;
  userAddress: string;
  protocolType: T;
  platformName: ProjectEnum;
  protocolName?: ProtocolName;
  liquidityPositions?: any[];
}

export class Transaction<T = string> {
  type: T;
  hash: string;
  timestamp: number;
  blockNumber: number;
  gasUsed?: number;
  gasPrice?: number;
  gasPriceUsd?: number;
}

export class Transactions extends BaseData<'transaction'> {
  @Type(() => Transaction)
  txs: Transaction[];
}

export class LiquidityChangeTransaction extends Transaction {
  type: LiquidityChangeTypeEnum;
  lpTokenAddress: string;
  liquidity: string;
  amountUSD?: number;
  tokens: PoolToken[];
}

export class SwapTransaction extends Transaction {
  type: TransactionTypeEnum.swap;
  @Type(() => SwapTokenDto)
  tokenIn: SwapToken;
  @Type(() => SwapTokenDto)
  tokenOut: SwapToken;
}

export class AutomaticMarketMaker extends BaseData<ProtocolTypeEnum.amm> {
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
