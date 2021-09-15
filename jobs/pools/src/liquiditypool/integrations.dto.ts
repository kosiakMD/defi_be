// eslint-disable-next-line max-classes-per-file
import { Expose, Transform } from 'class-transformer';

import { ChainIdEnum } from '../config/enum';

export class ERC20TokenDto {
  @Expose()
  address: string = null;

  @Expose()
  name: string = null;

  @Expose()
  symbol: string = null;

  @Expose()
  decimals: number = null;

  @Expose()
  @Transform(({ value }) => (value ? value : null))
  totalSupply?: string = null;
}

export class Fee {
  // feeVolume: number;
  rate: number = null; // 0.003
}

export class PoolPeriodStats {
  volume: number = null; // subgraph raw
  fee: number = null; // volume * fee percentage / rate
  ROI: number = null; // fee / TVL
}

export class PoolStatistic {
  day?: PoolPeriodStats = null;
  week?: PoolPeriodStats = null;
  year?: PoolPeriodStats = null;
}

export class PoolTokenDto {
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  address: string = null;

  @Expose()
  @Transform(({ value }) => (value ? value : null))
  name: string = null;

  @Expose()
  @Transform(({ value }) => (value ? value : null))
  symbol: string = null;

  @Expose()
  @Transform(({ value }) => (value ? value : null))
  reserve: string = null;

  @Expose()
  @Transform(({ value }) => (value ? value : null))
  value: number = null;

  @Expose()
  @Transform(({ value }) => (value ? value : null))
  balance: string = null;

  @Expose()
  @Transform(({ value }) => (value ? value : null))
  price: number = null;

  @Expose()
  @Transform(({ value }) => (value ? value : null))
  decimals: number = null;

  @Expose()
  @Transform(({ value }) => (value ? value : null))
  positionInPool: number = null;
}

export class LiquidityPoolFeature {
  @Expose()
  @Transform(({ value }) => (value ? value : null))
  address: string = null;

  @Expose()
  @Transform(({ value }) => (value ? value : null))
  name: string = null; // 'WETH / USDC'

  @Expose()
  @Transform(({ value }) => (value ? value : null))
  lpToken?: ERC20TokenDto = null;

  @Expose()
  @Transform(({ value }) => (value ? value : null))
  TVL?: number = null; // sum(reserve * price)

  @Expose()
  @Transform(({ value }) => (value ? value : new Fee()))
  fee: Fee = new Fee();

  @Expose()
  @Transform(({ value }) => (value ? value : new PoolStatistic()))
  statistic: PoolStatistic = new PoolStatistic();

  @Expose()
  @Transform(({ value }) => (value ? value : []))
  tokens: PoolTokenDto[] = [];
}

export class NotifyPayloadFeaturesDto {
  chain: ChainIdEnum;
  protocolName: string; // must be ProtocolNameEnum!
  featureName: string; // must be FeatureNameEnum!
  items: LiquidityPoolFeature[];
}

export class ProtocolsResponseData {
  status: string;
  errors: any;
  data: {
    name: string;
    project: string;
    features: {
      chain: {
        id: number;
      };
      list: string[];
    }[];
  }[];
}
