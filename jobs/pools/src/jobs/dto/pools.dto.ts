// todo: this dto is from integration service, need to optimise import
// eslint-disable-next-line max-classes-per-file
import { plainToClass } from 'class-transformer';

import { ERC20Token } from './common';

export class Stats {
  feeRate: number = null;
  tvl: number = null;
}

export class PoolStatistic {
  day?: PoolPeriodStats = null;
  week?: PoolPeriodStats = null;
  year?: PoolPeriodStats = null;
}

export class PoolPeriodStats {
  volume: number = null;
  fee: number = null;
  apr: number = null;
}

export class PoolTokenDto extends ERC20Token {
  reserve: number = null;
  value: number = null;
  balance: number = null;
  price: number = null;
  positionInPool: number = null;
  weight: number = null;
}

export class CurvePoolTokenDto extends PoolTokenDto {
  lp: CurveUnderlyingLpDto = null;
}

export class CurveUnderlyingLpDto extends ERC20Token {
  positionInPool: number = null;
}

export class LiquidityPoolFeature {
  address: string = null;
  name: string = null;
  lpToken: ERC20Token = null;
  stats: Stats = plainToClass(Stats, {});
  statistic: PoolStatistic = plainToClass(PoolStatistic, {});
  tokens: PoolTokenDto[] = [];
}

export class CurveLiquidityPoolFeature {
  address: string = null;
  name: string = null;
  lpToken: ERC20Token = null;
  stats: Stats = plainToClass(Stats, {});
  statistic: PoolStatistic = plainToClass(PoolStatistic, {});
  tokens: CurvePoolTokenDto[] = [];
}

export class PoolsFeatureMapping {
  dbId: number;
  dtoName: string;
  lpToken: {
    dbId: number;
    dtoName: string;
  };
  tokens?: {
    dbId: number;
    dtoName: string;
    positionInPool: number;
    weight?: number;
    lp?: { dbId: string; dtoName: string };
  }[];
}
