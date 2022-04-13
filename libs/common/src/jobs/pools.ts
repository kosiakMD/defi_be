// eslint-disable-next-line max-classes-per-file
import { plainToClass } from 'class-transformer';

import { ERC20Token } from '@app/common/jobs/token';

import { IntegrationClaimableTokenDto } from './staking';

export class Stats {
  feeRate: number = null;
  tvl: number = null;
  share: number = null;
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
  tokens?: PoolTokenDto[] = [];
}

// TODO: This should be built into 'PoolTokenDto' (don't need both)
export class CurvePoolTokenDto extends PoolTokenDto {
  tokens: CurvePoolTokenDto[] = [];
}

export class LiquidityPoolFeature {
  address: string = null;
  name: string = null;
  lpToken: ERC20Token = null;
  stats: Stats = plainToClass(Stats, {});
  statistic: PoolStatistic = plainToClass(PoolStatistic, {});
  tokens: PoolTokenDto[] = [];
  rewards?: IntegrationClaimableTokenDto[];
  // data not included to feature but need to have to get realtime data
  extra?: any = {};
}

export class CurveUnderlyingLpDto extends PoolTokenDto {
  //
}

export class CurveLiquidityPoolFeature {
  address: string = null;
  name: string = null;
  lpToken: ERC20Token = null;
  stats: Stats = plainToClass(Stats, {});
  statistic: PoolStatistic = plainToClass(PoolStatistic, {});
  tokens: Array<CurveUnderlyingLpDto> = [];
  registry?: string = null;
}
