// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';

import { UniswapToken } from '../interfaces/entity.information.interfaces';

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

export class UniswapLiquidityPosition {
  liquidityTokenBalance: string = null;
  user: string = null;
  @Type(() => UniswapLiquidityPositionPair)
  pair: UniswapLiquidityPositionPair = null;
}

export class LiquidityPositionResponseData {
  @Type(() => UniswapLiquidityPosition)
  liquidityPositions: UniswapLiquidityPosition[];
}

export class LiquidityPositionResponse {
  @Type(() => LiquidityPositionResponseData)
  data: LiquidityPositionResponseData;
}
