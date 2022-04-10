// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';

import { IncomeToken } from '../interfaces';

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
  reserveETH?: string = null;
}

export class IncomeLiquidityPosition {
  liquidityTokenBalance: string = null;
  user: string = null;
  @Type(() => IncomeLiquidityPositionPair)
  pair: IncomeLiquidityPositionPair = null;
}
