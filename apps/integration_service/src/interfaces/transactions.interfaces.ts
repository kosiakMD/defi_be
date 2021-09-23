// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AaveUser } from '@app/common';
import { IncomeLiquidityPosition } from '@app/common/dto/liquidity.position.dto';
import {
  ChainIdEnum,
  LiquidityChangeTypeEnum,
  ProjectEnum,
  ProtocolTypeEnum,
  TransactionTypeEnum,
} from '@app/common/enum';
import { ProtocolName, Address } from '@app/common/types';

import { LPToken } from '../integrations/integrations.dto';

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
  name: string;
  @ApiProperty({ type: String, example: 'ETH' })
  symbol: string;
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
  @ApiProperty({ type: String, example: '69393241' })
  totalSupply?: string;
}

export class StakingErcToken extends ERC20Token {
  @ApiProperty({ type: Number, example: 3759.23 })
  price?: number = null;

  @ApiProperty({ type: Number, example: 1.2512 })
  value?: number;

  @ApiProperty({ type: String, example: '123.6534' })
  balance?: string;
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
