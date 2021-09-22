// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';

import { DirectionEnum, LiquidityChangeTypeEnum, TransactionTypeEnum } from 'src/common/enum';

import { IncomeToken } from '../interfaces/entity.information.interfaces';
import {
  ERC20Token,
  LiquidityChangeTransaction,
  PoolToken,
  PoolTokenDto,
  SwapToken,
  SwapTransaction,
  Transaction,
} from '../interfaces/transactions.interfaces';

export class IncomeLiquidityPositionPair {
  id: string = null;
  reserve0: string = null;
  reserve1: string = null;
  reserveUSD: string = null;
  @Type(() => IncomeToken)
  token0: IncomeToken = null;
  token0Price: string = null;
  @Type(() => IncomeToken)
  token1: IncomeToken = null;
  token1Price: string = null;
  totalSupply: string = null;
}

export class LiquidityPool {
  address: string = null;
  name?: string = null;
}

export class IncomeLiquidityPosition {
  liquidityTokenBalance: string = null;
  user: string = null;
  @Type(() => IncomeLiquidityPositionPair)
  pair: IncomeLiquidityPositionPair = null;
}

export class TransferTransaction extends Transaction {
  type: TransactionTypeEnum.transfer = null;
  direction: DirectionEnum = null;
  token: SwapToken[] = null;
}

export type AMMTransaction = LiquidityChangeTransaction | SwapTransaction | TransferTransaction;

export class LiquidityPosition {
  lpToken: ERC20Token = null;
  pool?: LiquidityPool = null;
  lpTokenBalance: string = null;
  exitedAt?: number = null;
  earnedFeeUSD?: number = null;
  @Type(() => PoolTokenDto)
  poolTokens: PoolToken[] = null;
  @Type(() => Transaction, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: LiquidityChangeTransaction, name: LiquidityChangeTypeEnum.addLiquidity },
        { value: LiquidityChangeTransaction, name: LiquidityChangeTypeEnum.removeLiquidity },
        { value: SwapTransaction, name: TransactionTypeEnum.swap },
        { value: TransferTransaction, name: TransactionTypeEnum.transfer },
      ],
    },
  })
  transactions?: AMMTransaction[] = null;
  project?: string = null;
}

export class LiquidityPositionResponseData {
  @Type(() => IncomeLiquidityPosition)
  liquidityPositions: IncomeLiquidityPosition[];
}

export class LiquidityPositionResponse {
  @Type(() => LiquidityPositionResponseData)
  data: LiquidityPositionResponseData;
}
