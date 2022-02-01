// eslint-disable-next-line max-classes-per-file
import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';
import { DetailedResponseDto } from './index';

import { ProtocolFeaturesInfo } from '../types/protocol.types';
import { ProtocolBasicInfo, ProtocolFeaturesInfoDto } from './features.dto';
import { FeatureResult } from '../types/features.types';
import { ChainDto } from './chain.dto';
import { MetaDto } from './response.dto';
import { ERC20Token, StakingPosition } from './transactions.interfaces';
import { FeatureEnum } from '../enum/feature.enum';
import { CurrencyDto } from '@app/common';

export class ProtocolInfoDto extends ProtocolBasicInfo {
  @Exclude()
  features: ProtocolFeaturesInfo;
}

export type IntegrationFeaturesData = {
  [key in keyof typeof FeatureEnum]?: FeatureResult<LiquidityPoolFeature | StakingPositionDto | StakingPosition>;
} & {
  errors: string[] | Error[];
};

@Exclude()
export class IntegrationFeaturesDataDto implements IntegrationFeaturesData {
  errors: string[] | Error[];
  @Expose()
    // eslint-disable-next-line prettier/prettier
  [FeatureEnum.pools]?: FeatureResult<LiquidityPoolFeature>;
  @Expose()
  [FeatureEnum.staking]?: FeatureResult<StakingPosition>;
}

export class IntChainsDataDto extends IntegrationFeaturesDataDto {
  @ApiProperty({ type: ChainDto })
  chain: ChainDto = null;

  @ApiProperty({ type: ProtocolFeaturesInfoDto })
  features: FeatureEnum[] = [];
}

export class IntegrationDataDto {
  @ApiProperty({ type: MetaDto, required: false })
  __meta?: MetaDto;

  @ApiProperty({ type: ProtocolInfoDto })
  protocol: ProtocolInfoDto = null;

  @ApiProperty({ type: CurrencyDto})
  currency = null;

  @ApiProperty({ type: [IntChainsDataDto] })
  chains: IntChainsDataDto[] = [];
}

export class IntegrationsResponseDto extends DetailedResponseDto<IntegrationDataDto> {
  @ApiProperty({ type: IntegrationDataDto })
  @Type(() => IntegrationDataDto)
  data: IntegrationDataDto = null;
}

export class PoolTokenDto {
  @ApiProperty({type: String, example: '0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d'})
  address: string = null;

  @ApiProperty({type: String, example: 'Wrapped Ethereum'})
  name: string = null;

  @ApiProperty({type: String, example: 'WETH'})
  symbol: string = null;

  @ApiProperty({type: String, example: '4362346'})
  reserve: string = null;
  //
  @ApiProperty({type: Number, example: 1.2512})
  value: number = null;

  @ApiProperty({type: String, example: '123.6534'})
  balance: string = null;
  @ApiProperty({type: Number, example: 345.12})
  price: number = null;

  @ApiProperty({type: Number, example: 18})
  decimals: number = null;
}

export class Fee {
  rate: number = null; // 0.003
}

export class ERC20TokenDto {
  address: string = null;
  name: string = null;
  symbol: string = null;
  decimals: number = null;
  totalSupply?: string = null;
}

export class PoolPeriodStats {
  volume: number = null;
  fee: number = null;
  ROI: number = null;
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
  value: number = null;
  share: number = null;
}

export class LiquidityPoolFeature {
  address: string = null;
  name: string = null;
  @Type(() => ERC20TokenDto)
  lpToken?: ERC20TokenDto = null;
  TVL?: number = null;
  @Type(() => Fee)
  fee: Fee = new Fee();
  @Type(() => PoolUserData)
  user: PoolUserData = new PoolUserData();
  @Type(() => PoolStatistic)
  statistic: PoolStatistic = new PoolStatistic();
  @Type(() => PoolTokenDto)
  tokens: PoolTokenDto[] = [];
}

export class ClaimAbleTokenDto extends ERC20Token {
  claimed: {
    intValue: string,
    value: string,
  };
  claimable: {
    intValue: string,
    value: string,
  };
  claimedValue: number;
  claimableValue: number;
  price: number;
}

export class StakingPositionDto {
  address: string;
  poolId: string;
  poolName: string;
  staked: string;
  stakingToken: ERC20TokenDto;
  rewardToken: ClaimAbleTokenDto;
}
