// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { Address } from '../common/types';
import {
  ChainIdEnum,
  LiquidityChangeTypeEnum,
  ProjectEnum,
  ProtocolName,
  ProtocolTypeEnum,
  TransactionTypeEnum,
} from 'src/common/enum';

import {
  AaveUser,
  LiquidityPosition,
  IncomeLiquidityPosition,
} from '../dto/liquidity.position.dto';
import { LPToken } from '../integrations/integrations.dto';
import { BorrowingPosition, LendingPosition } from './lending.position.interfaces';

export type TokenSymbol = string;

export interface PriceAble {
  priceUSD?: number;
}

export interface AmountAble {
  amount?: string;
}

export class ERC20Token {
  @ApiProperty({ type: String, example: '0x0000000000000000000000000000000000000000' })
  address: string;
  @ApiProperty({ type: String, example: 'Ethereum' })
  name?: string = null;
  @ApiProperty({ type: String, example: 'ETH' })
  symbol?: string = null;
  @ApiProperty({ type: Number, example: 18 })
  decimals?: number = null;
  @ApiProperty({ type: String, example: '69393241' })
  totalSupply?: string = null;
}

export class StakingErcToken extends ERC20Token {
  @ApiProperty({ type: Number, example: 3759.23 })
  price?: number = null;

  @ApiProperty({ type: Number, example: 1.2512 })
  value?: number = null;

  @ApiProperty({ type: String, example: '123.6534' })
  balance?: string = null;
}

export class LendingErcToken extends ERC20Token {
  @ApiProperty({ type: Number, example: 3759.23 })
  price?: number = null;
}

export class LeverageErcToken extends ERC20Token {
  @ApiProperty({ type: Number, example: 3759.23 })
  price?: number = null;

  @ApiProperty({ type: Number, example: 1.2512 })
  value?: number = null;

  @ApiProperty({ type: String, example: '123.6534' })
  balance?: string = null;
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

export class LendTokenDto extends ERC20Token implements PriceAble {
  priceUSD: number;
}

export interface SwapToken extends ERC20Token, AmountAble, PriceAble {}

export class SwapTokenDto extends ERC20Token implements SwapToken {
  priceUSD?: number;
  amount?: string;
}

export interface UniswapResponseData {
  uniswapLiquidityPositions: Map<string, IncomeLiquidityPosition[]>;
  sushiswapStakingPosition?: Map<string, any>;
  aaveLendingPositions?: Map<string, AaveUser>;
}

export interface ClaimAbleToken extends ERC20Token {
  claimed?: string;
  claimable?: string;
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
  lpToken?: ERC20Token;
  rewardToken: ClaimAbleToken;
  stakingToken?: StakingErcToken | LPToken;
  liquidityPoolTokens?: PoolToken[];
  transactions?: StakingTransaction[];
}

export class BaseData<T = keyof typeof ProtocolTypeEnum> {
  chainId: ChainIdEnum;
  userAddress: string;
  protocolType: T;
  projectName: ProjectEnum;
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

export class Transactions extends BaseData<ProtocolTypeEnum.transaction> {
  @Type(() => Transaction)
  txs: Transaction[];
}

export class LendingDto extends BaseData<ProtocolTypeEnum.lending> {
  lendingPositions: LendingPosition[];
}
export class BorrowingDto extends BaseData<ProtocolTypeEnum.borrowing> {
  borrowingPositions: BorrowingPosition[];
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
