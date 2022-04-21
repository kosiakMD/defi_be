// eslint-disable-next-line max-classes-per-file
import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import {
  ChainDto,
  CurrencyDto,
  DetailedResponseDto,
  FeatureEnum,
  FeatureResult,
  IntegrationFeaturesData,
  MetaDto,
  PoolTokenDto,
  ProtocolBasicInfo,
  ProtocolFeaturesInfo,
  ProtocolFeaturesInfoDto,
  StakingPositionFeatureDto
} from '@app/common';
import { IntegrationERC20TokenDto, IntegrationStakingPositionDto } from '@app/common/jobs/staking';

export class Fee {
  // feeVolume: number;
  rate: number = null; // 0.003
}

export class ProtocolInfoDto extends ProtocolBasicInfo {
  @Exclude()
  features: ProtocolFeaturesInfo; // ProtocolFeaturesDataDto;
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

export class LiquidityPoolFeature {
  address: string = null;

  name: string = null; // 'WETH / USDC'

  // TODO: lp balance?
  @Type(() => IntegrationERC20TokenDto)
  lpToken?: IntegrationERC20TokenDto = null;
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

export class Stats {
  apy: number = null;
  apr: number = null;
  tvl: number = null;
}

@Exclude()
export class IntegrationFeaturesDataDto implements IntegrationFeaturesData {
  errors: string[] | Error[];
  @Expose()
    // eslint-disable-next-line prettier/prettier
  [FeatureEnum.pools]?: FeatureResult<LiquidityPoolFeature>;
  @Expose()
  [FeatureEnum.staking]?: FeatureResult<StakingPositionFeatureDto> | FeatureResult<IntegrationStakingPositionDto>;
}

export class IntChainsDataDto extends IntegrationFeaturesDataDto {
  @ApiProperty({ type: ChainDto })
  @Type(() => ChainDto)
  chain: ChainDto = null; // chains of chain + features data & info

  @ApiProperty({ type: ProtocolFeaturesInfoDto })
  @Type(() => ProtocolFeaturesInfoDto)
  features: FeatureEnum[] = []; // ProtocolFeaturesDataDto;

  total?: number;
}

export class IntegrationDataDto {
  @ApiProperty({ type: MetaDto, required: false })
  __meta?: MetaDto;

  @ApiProperty({ type: ProtocolInfoDto })
  @Type(() => ProtocolInfoDto)
  protocol: ProtocolInfoDto = null;

  @ApiProperty({ type: CurrencyDto })
  @Type(() => CurrencyDto)
  currency: CurrencyDto = null;

  @ApiProperty({ type: [ IntChainsDataDto ] })
  @Type(() => IntChainsDataDto)
  chains: IntChainsDataDto[] = [];

  // @ApiProperty({ type: IntegrationFeaturesDataDto, name: 'IntegrationFeaturesDataDto' })
  // result: IntegrationFeaturesDataDto = null;
}

export class IntegrationsResponseDto extends DetailedResponseDto<IntegrationDataDto> {
  @ApiProperty({ type: IntegrationDataDto })
  @Type(() => IntegrationDataDto)
  data: IntegrationDataDto = null;
}

export class IntegrationWalletDto {
  address: string;
  chains: IntChainsDataDto[] = [];
}

export class IntegrationDataV2Dto {
  __meta?: MetaDto;
  protocol: ProtocolInfoDto = null;
  wallets: IntegrationWalletDto[];
  total?: number;
}

export class IntegrationsResponseV2Dto extends DetailedResponseDto<IntegrationDataV2Dto> {
  data: IntegrationDataV2Dto = null;
}
