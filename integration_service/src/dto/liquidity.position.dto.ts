// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';

import { IncomeToken } from '../interfaces/entity.information.interfaces';
import { ERC20Token, PoolToken, PoolTokenDto } from '../interfaces/transactions.interfaces';

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

export class AaveReserve {
  id: string = null; // reserve ID

  // underlying token
  underlyingAsset: string = null;
  symbol: string = null;
  decimals: number = null;
  name: string = null;
  priceUSD?: number = null;

  // APY/APR calculations
  liquidityRate: string = null;
  stableBorrowRate: string = null;
  variableBorrowRate: string = null;
  aEmissionPerSecond: string = null;
  vEmissionPerSecond: string = null;
  sEmissionPerSecond: string = null;
  totalATokenSupply: string = null;
  totalCurrentVariableDebt: string = null;
}

export class AaveUserReserve {
  currentTotalDebt = '0';
  currentStableDebt = '0';
  currentVariableDebt = '0';
  currentATokenBalance = '0';
  reserve: AaveReserve;
}

export class AaveUser {
  userAddress: string;
  reserves: AaveUserReserve[];
}

export class LiquidityPosition {
  lpToken: ERC20Token = null;
  pool?: LiquidityPool = null;
  lpTokenBalance: string = null;
  exitedAt?: number = null;
  earnedFeeUSD?: number = null;
  rewards?: PoolToken[];
  @Type(() => PoolTokenDto)
  poolTokens: PoolToken[] = null;
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
