// eslint-disable-next-line max-classes-per-file
import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';
import { ERC20TokenDto, StakingPositionFeatureDto } from './index';

import { FeatureEnum } from '@app/common/enum';
import { FeatureResult, ProtocolFeaturesInfo, StakingPosition } from '@app/common';
import { ProtocolBasicInfo, ProtocolFeaturesInfoDto } from './features.dto';
import { ChainDto } from './chain.dto';

import { MetaDto } from './response.dto';

import { CurrencyDto } from './currency.dto';

export class ProtocolInfoDto extends ProtocolBasicInfo {
  @Exclude()
  features: ProtocolFeaturesInfo; // ProtocolFeaturesDataDto;
}

// type data = {
//   protocol: { name: string; project: string };
//   currency: CurrencyDto;
//   chains: {
//     features?: string[];
//     chain: ChainDto;
//     //
//     pools: any[];
//     staking: any[];
//   }[];
// };


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
  @Type(() => PoolPeriodStats)
  day?: PoolPeriodStats = null;
  @Type(() => PoolPeriodStats)
  week?: PoolPeriodStats;
  @Type(() => PoolPeriodStats)
  year?: PoolPeriodStats;
}

export class PoolUserData {
  value: number = null; // sum of values
  share: number = null; // value / TVL
}

export class LiquidityPoolFeatureDto {
  address: string = null;
  name: string = null; // 'WETH / USDC'
  // TODO: lp balance?
  @Type(() => ERC20TokenDto)
  lpToken?: ERC20TokenDto = null;
  TVL?: number = null; // sum(reserve * price)
  // volumeChangePercentage?: number;
  @Type(() => Fee)
  fee: Fee = new Fee();
  @Type(() => PoolUserData)
  user: PoolUserData = new PoolUserData();
  @Type(() => PoolStatistic)
  statistic: PoolStatistic = new PoolStatistic();
  @Type(() => PoolTokenDto)
  tokens: PoolTokenDto[] = [];
}

export type IntegrationFeaturesData = {
  [key in keyof typeof FeatureEnum]?: FeatureResult<LiquidityPoolFeatureDto | StakingPositionFeatureDto | StakingPosition>;
} & {
  // errors: string[] | Error[];
  errors: string[] | string[][] | string[][][] | Error[];
};

@Exclude()
export class IntegrationFeaturesDataDto implements IntegrationFeaturesData {
  @Exclude()
  errors: string[] | string[][] | string[][][] | any[] = []; // any[] for [[[Error], Error], [Error]].flat()
  @Expose()
    // eslint-disable-next-line prettier/prettier
  [FeatureEnum.pools]?: FeatureResult<LiquidityPoolFeatureDto>;
  @Expose()
  [FeatureEnum.staking]?: FeatureResult<StakingPosition/*StakingPositionFeatureDto*/>;
}

export class IntChainsDataDto extends IntegrationFeaturesDataDto {
  @ApiProperty({ type: ChainDto })
  chain: ChainDto = null; // chains of chain + features data & info

  @ApiProperty({ type: ProtocolFeaturesInfoDto })
  features: FeatureEnum[] = []; // ProtocolFeaturesDataDto;
}

export class IntegrationDataDto {
  @ApiProperty({ type: MetaDto, required: false })
  __meta?: MetaDto;

  @ApiProperty({ type: ProtocolInfoDto })
  protocol: ProtocolInfoDto = null;

  @ApiProperty({ type: CurrencyDto})
  currency: CurrencyDto = null;

  @ApiProperty({ type: [IntChainsDataDto] })
  chains: IntChainsDataDto[] = [];

  // @ApiProperty({ type: IntegrationFeaturesDataDto, name: 'IntegrationFeaturesDataDto' })
  // result: IntegrationFeaturesDataDto = null;
}

// export class IntegrationsResponseDto extends DetailedResponseDto<IntegrationDataDto> {
//   @ApiProperty({ type: IntegrationDataDto })
//   @Type(() => IntegrationDataDto)
//   data: IntegrationDataDto = null;
// }
