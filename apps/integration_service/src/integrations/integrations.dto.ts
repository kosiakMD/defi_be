// eslint-disable-next-line max-classes-per-file
import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { DetailedResponseDto, MetaDto } from '@app/common/dto';
import { ChainDto } from '@app/common/dto/chain.dto';
import { BorrowToken, ERC20Token, LeverageErcToken, StakingPosition } from '../interfaces/transactions.interfaces';
import { ProtocolBasicInfo, ProtocolFeaturesInfoDto } from '../protocol/features/features.dto';
import { FeatureEnum } from '../protocol/features/features.enum';
import { ProtocolFeaturesInfo } from '../protocol/protocol.types';
import { CurrencyDto } from '@app/common/dto/currency.dto';
import { FeatureResult } from '../protocol/features/features.types';
import { LendingPositionDto, BorrowingPosition } from '@app/common';
import { LeverageFarmingPosition } from '../interfaces/leverage.farming.interfaces';

export class ProtocolInfoDto extends ProtocolBasicInfo {
  @Exclude()
  features: ProtocolFeaturesInfo; // ProtocolFeaturesDataDto;
}

@Exclude()
export class PoolTokenDto {
  @ApiProperty({type: String, example: '0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d'})
  @Expose()
  address: string = null;

  @ApiProperty({type: String, example: 'Wrapped Ethereum'})
  @Expose()
  name: string = null; // WETH

  @ApiProperty({type: String, example: 'WETH'})
  @Expose()
  symbol: string = null;
  // balance total & user

  @ApiProperty({type: String, example: '4362346'})
  @Expose()
  reserve: string = null;
  //
  @ApiProperty({type: Number, example: 1.2512})
  @Expose()
  value: number = null; // Balance value // balance * price

  @ApiProperty({type: String, example: '123.6534'})
  @Expose()
  balance: string = null; // string | Balance
  // price: Price = null; // value in currency [usd]

  @ApiProperty({type: Number, example: 345.12})
  @Expose()
  price: number = null; // value in currency [usd]

  @ApiProperty({type: Number, example: 18})
  @Expose()
  decimals: number = null;
}

export class Fee {
  // feeVolume: number;
  rate: number = null; // 0.003
}

export class IntegrationERC20TokenDto {
  @ApiProperty({type: String, example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'})
  address: string = null;

  @ApiProperty({type: String, example: 'Binance Coin'})
  name: string = null;

  @ApiProperty({type: String, example: 'BNB'})
  symbol: string = null;

  @ApiProperty({type: Number, example: 18})
  decimals: number = null;

  @ApiProperty({type: String, example: '1243522'})
  totalSupply?: string = null;

  @ApiProperty({type: Number, example: 3759.23})
  price?: number = null;

  @ApiProperty({ type: Number, example: 1.2512 })
  value?: number = null;

  @ApiProperty({ type: String, example: '123.6534' })
  balance?: string = null;

  /**
   * If LP token
   */
  @ApiProperty({type: [PoolTokenDto]})
  tokens?: PoolTokenDto[];
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

export class ClaimableDto {
  @ApiProperty({type: String, example: '1.23413'})
  balance: string = null;
  @ApiProperty({type: String, example: '123413'})
  value: number = null;
}

@Exclude()
export class IntegrationClaimableTokenDto extends ERC20Token {
  @ApiProperty({type: ClaimableDto})
  @Expose()
  claimableData?: ClaimableDto = null;

  @ApiProperty({type: String, example: 543.675})
  @Expose()
  price?: number = null;
}

export class LPToken extends IntegrationERC20TokenDto {
  @ApiProperty({type: [PoolTokenDto]})
  tokens: PoolTokenDto[] = [];
}

// TODO: same as StakingPoolFeature!!!
export class IntegrationStakingPositionDto {
  @Expose()
  @ApiProperty({type: String, example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'})
  address: string = null;// vault address

  @Expose()
  @ApiProperty({type: String, example: '6'})
  poolId: string = null; // number of pool - get from subgraph

  @Expose()
  @ApiProperty({type: String, example: 'poolName'})
  poolName: string = null;

  @Expose()
  @ApiProperty({type: String, example: '642354'})
  staked: string = null; // amount

  @Expose()
  @ApiProperty({ type: LPToken })
  stakingToken: IntegrationERC20TokenDto; // - lpToken info

  @Expose()
  @ApiProperty({type: IntegrationClaimableTokenDto})
  rewardToken: IntegrationClaimableTokenDto; // for autofarm always will be one token(Token AUTOv2)
}

export class StakingPositionResponseDto {
  // @ApiProperty({type: String, example: '0x60de7f647df2448ef17b9e0123411724de6e373d'})
  // userAddress: string;

  @ApiProperty({type: String, example: 1329299651716364})
  totalValue: number;

  @ApiProperty({type: [IntegrationStakingPositionDto]})
  stakingPositions: IntegrationStakingPositionDto[];
}

export class LeverageFarmingPositionDto implements LeverageFarmingPosition {
  @ApiProperty({type: String, example: '0x60dE7F647dF2448eF17b9E0123411724De6e373D'})
  address: string;
  @ApiProperty({type: BorrowToken})
  borrowToken: BorrowToken;
  @ApiProperty({type: Number, example: 75.1})
  debtRatio: number;
  @ApiProperty({type: String, example: 144.2})
  earned: number;
  @ApiProperty({ oneOf: [
      { $ref: getSchemaPath(LPToken) },
      { $ref: getSchemaPath(LeverageErcToken)}
      ]}
      )
  farmToken: LPToken | LeverageErcToken;
}


export type IntegrationFeaturesData = {
  [key in keyof typeof FeatureEnum]?: FeatureResult<LiquidityPoolFeature | StakingPositionResponseDto | StakingPosition | LendingPositionDto | BorrowingPosition>;
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
  [FeatureEnum.staking]?: FeatureResult<StakingPosition/*StakingPositionFeatureDto*/>;
}

export class IntChainsDataDto extends IntegrationFeaturesDataDto {
  @ApiProperty({ type: ChainDto })
  @Type(() => ChainDto)
  chain: ChainDto = null; // chains of chain + features data & info

  @ApiProperty({ type: ProtocolFeaturesInfoDto })
  @Type(() => ProtocolFeaturesInfoDto)
  features: FeatureEnum[] = []; // ProtocolFeaturesDataDto;
}

export class IntegrationDataDto {
  @ApiProperty({ type: MetaDto, required: false })
  __meta?: MetaDto;

  @ApiProperty({ type: ProtocolInfoDto })
  @Type(() => ProtocolInfoDto)
  protocol: ProtocolInfoDto = null;

  @ApiProperty({ type: CurrencyDto})
  @Type(() => CurrencyDto)
  currency: CurrencyDto = null;

  @ApiProperty({ type: [IntChainsDataDto] })
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
