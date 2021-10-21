// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';

import {
  ClaimTransaction,
  PoolToken,
  StakeTransaction,
  StakingPosition,
  SwapToken,
  UnStakeTransaction,
} from '@app/common';
import { LiquidityChangeTypeEnum, ProtocolTypeEnum, TransactionTypeEnum } from '@app/common/enum';

import { BaseData } from './BaseData';
import { ERC20Token } from './ERC20Token';
import { Transaction } from './Transaction';

export type TokenSymbol = string;

export class SwapTokenDto extends ERC20Token implements SwapToken {
  priceUSD?: number;
  amount?: string;
}

export type StakingTransaction = StakeTransaction | UnStakeTransaction | ClaimTransaction;

export class TransactionProjectDto extends BaseData<ProtocolTypeEnum.transaction> {
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
