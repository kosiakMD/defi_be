// eslint-disable-next-line max-classes-per-file
import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { DetailedResponseDto, MetaDto } from '../dto';
import { ChainDto } from '../dto/chain.dto';
import { ClaimAbleToken, Transaction } from '../interfaces/transactions.interfaces';
import { ProtocolBasicInfo, ProtocolFeaturesInfoDto } from '../protocol/features/features.dto';
import { FeatureEnum } from '../protocol/features/features.enum';
import { FeatureResult } from '../protocol/features/features.types';
import { ProtocolFeaturesInfo } from '../protocol/protocol.types';
import { FeatureDto } from './integrationFeatures';

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

export type IntegrationFeaturesData = {
  [key in keyof typeof FeatureEnum]?: LiquidityPoolFeature[] | FeatureResult | FeatureResult[];
};

@Exclude()
export class IntegrationFeaturesDataDto implements IntegrationFeaturesData {
  @Expose()
    // eslint-disable-next-line prettier/prettier
  [FeatureEnum.pools]?: FeatureDto | FeatureResult | FeatureResult[];
  @Expose()
  [FeatureEnum.staking]?: FeatureDto | FeatureResult | FeatureResult[];
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

  @ApiProperty({ type: [IntChainsDataDto] })
  chains: IntChainsDataDto[] = [];

  // @ApiProperty({ type: IntegrationFeaturesDataDto, name: 'IntegrationFeaturesDataDto' })
  // result: IntegrationFeaturesDataDto = null;
}

export class IntegrationsResponseDto extends DetailedResponseDto<IntegrationDataDto> {
  @ApiProperty({ type: IntegrationDataDto })
  @Type(() => IntegrationDataDto)
  data: IntegrationDataDto = null;
}

export class PoolTokenDto {
  address: string = null;
  label: string = null; // WETH
  symbol: string = null;
  // balance total & user
  reserve: string = null;
  //
  value: number = null; // Balance value
  balance: string = null; // string | Balance
  // price: Price = null; // value in currency [usd]
  price: number = null; // value in currency [usd]
  decimals: number = null;
}

export class Fee {
  // feeVolume: number;
  percentage: number = null;
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
  day: PoolPeriodStats = null;
  @Type(() => PoolPeriodStats)
  week: PoolPeriodStats = null;
  @Type(() => PoolPeriodStats)
  year: PoolPeriodStats = null;
}

export class PoolUserData {
  value: number = null;
  share: number = null;
}

export class LiquidityPoolFeature {
  poolAddress: string;
  label: string; // 'WETH / USDC'
  @Type(() => ERC20TokenDto)
  lpToken?: ERC20TokenDto = null;
  TVL?: number = null;
  volume?: number = null;
  // volumeChangePercentage?: number;
  @Type(() => Fee)
  fee: Fee = null;
  @Type(() => PoolStatistic)
  statistic: PoolStatistic = null;
  @Type(() => PoolUserData)
  user: PoolUserData = null;
  @Type(() => PoolTokenDto)
  tokens: PoolTokenDto[] = [];
}

export class StakingPositionDto {
  address: string;
  staked: string;
  lpToken: PoolTokenDto;
  rewardToken: ClaimAbleToken;
  liquidityPoolTokens: PoolTokenDto[];
  transactions?: Transaction[];
  poolId?: string;
}
