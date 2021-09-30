// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import {
  ClaimTransaction,
  LiquidityPosition,
  PoolToken,
  ProtocolName,
  StakeTransaction,
  StakingPosition,
  SwapToken,
  UnStakeTransaction,
} from '@app/common';
import {
  ChainIdEnum,
  LiquidityChangeTypeEnum,
  ProjectEnum,
  ProtocolTypeEnum,
  TransactionTypeEnum,
} from '@app/common/enum';

export type TokenSymbol = string;

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

export class SwapTokenDto extends ERC20Token implements SwapToken {
  priceUSD?: number;
  amount?: string;
}

export type StakingTransaction = StakeTransaction | UnStakeTransaction | ClaimTransaction;

export class BaseData<T = keyof typeof ProtocolTypeEnum> {
  chainId: ChainIdEnum;
  userAddress: string;
  protocolType: T;
  projectName: ProjectEnum;
  protocolName?: ProtocolName;
  liquidityPositions?: any[];
  stakingPositions?: any[];
  borrowingPositions?: any[];
  lendingPositions?: any[];
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

export class TransactionProjectDto extends BaseData<ProtocolTypeEnum.transaction> {
  // @Type(() => Transaction)
  txs: Transaction[] = [];
}

export class StakingProjectDto extends BaseData<ProtocolTypeEnum.staking> {
  stakingPositions: StakingPosition[] = [];
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
