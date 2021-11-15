// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ProtocolName } from '@app/common';
import { FeatureEnum } from '@app/common';
import { ChainIdEnum } from '@app/common/enum';

import { FeatureName } from '../integrations/integrationFeatures';

export class ERC20TokenDto {
  address: string = null;
  name: string = null;
  symbol: string = null;
  decimals: number = null;
  totalSupply?: string = null;
}

export class Fee {
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
  address: string = null;
  name: string = null; // WETH
  symbol: string = null;
  // balance total & user
  reserve: string = null;
  //
  value: number = null; // Balance value // balance * price
  balance: string = null; // string | Balance
  // price: Price = null; // value in currency [usd]
  price: number = null; // value in currency [usd]
  decimals: number = null;
  positionInPool: number = null;
}

export class LiquidityPoolFeature {
  address: string = null;
  name: string = null; // 'WETH / USDC'
  lpToken?: ERC20TokenDto = null;
  TVL?: number = null; // sum(reserve * price)
  fee: Fee = new Fee();
  statistic: PoolStatistic = new PoolStatistic();
  tokens: PoolTokenDto[] = [];
}

export class NotifyPayloadFeaturesDto {
  @ApiProperty({ example: ChainIdEnum.ftm })
  chain: ChainIdEnum;

  @ApiProperty({ example: 'SpookySwap' })
  protocolName: ProtocolName;

  @ApiProperty({ example: FeatureEnum.pools })
  featureName: FeatureName;

  @ApiProperty({ example: [] })
  items: any[];
}

export class SavePoolsResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  success: boolean;
  @ApiProperty({ type: Number, example: 9 })
  count: number;
}
