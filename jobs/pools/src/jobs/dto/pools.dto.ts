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
  reserve: string = null;
  value: number = null;
  balance: string = null;
  price: number = null;
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
