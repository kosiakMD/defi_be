// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';

import { DirectionEnum, LiquidityChangeTypeEnum, TransactionTypeEnum } from '../enum';
import { ERC20Token, PoolToken } from '../interfaces';
import { UniswapToken } from '../interfaces/entity.information.interfaces';
import PoolTokenDto from './PoolToken.dto';
import {
  LiquidityChangeTransaction,
  SwapToken,
  SwapTransaction,
  Transaction,
} from './transactions.interfaces';

export class UniswapLiquidityPositionPair {
  id: string = null;
  reserve0: string = null;
  reserve1: string = null;
  reserveUSD: string = null;
  @Type(() => UniswapToken)
  token0: UniswapToken = null;
  token0Price: string = null;
  @Type(() => UniswapToken)
  token1: UniswapToken = null;
  token1Price: string = null;
  totalSupply: string = null;
}

export class LiquidityPool {
  address: string = null;
  name?: string = null;
}

export class UniswapLiquidityPosition {
  liquidityTokenBalance: string = null;
  user: string = null;
  @Type(() => UniswapLiquidityPositionPair)
  pair: UniswapLiquidityPositionPair = null;
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
  @Type(() => UniswapLiquidityPosition)
  liquidityPositions: UniswapLiquidityPosition[];
}

export class LiquidityPositionResponse {
  @Type(() => LiquidityPositionResponseData)
  data: LiquidityPositionResponseData;
}
