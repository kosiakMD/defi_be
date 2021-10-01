// eslint-disable-next-line max-classes-per-file
import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { DetailedResponseDto, MetaDto } from '../dto';
import { ChainDto } from '../dto/chain.dto';
import { ERC20Token, LeverageErcToken, StakingPosition } from '../interfaces/transactions.interfaces';
import { ProtocolBasicInfo, ProtocolFeaturesInfoDto } from '../protocol/features/features.dto';
import { FeatureEnum } from '../protocol/features/features.enum';
import { ProtocolFeaturesInfo } from '../protocol/protocol.types';
import { CurrencyDto } from '../dto/currency.dto';
import { FeatureResultDto } from '../protocol/features/features.types';
import { BorrowingPosition, LendingPosition } from 'src/interfaces/lending.position.interfaces';
import { BorrowToken, LeverageFarmingPosition } from '../interfaces/leverage.farming.interfaces';

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
  [key in keyof typeof FeatureEnum]?: FeatureResultDto<LiquidityPoolFeature | StakingPositionResponseDto | StakingPosition | LendingPosition | BorrowingPosition | LeverageFarmingPosition>;
} & {
  errors?: string[] | Error[];
};

@Exclude()
export class IntegrationFeaturesDataDto implements IntegrationFeaturesData {
  errors: string[] | Error[];
  @Expose()
    // eslint-disable-next-line prettier/prettier
  [FeatureEnum.pools]?: FeatureResultDto<LiquidityPoolFeature>;
  @Expose()
  [FeatureEnum.staking]?: FeatureResultDto<StakingPosition/*StakingPositionFeatureDto*/>;
  @Expose()
  [FeatureEnum.lending]?: FeatureResultDto<LendingPosition/*LendingPositionFeatureDto*/>;
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

export class PoolTokenDto {
  @ApiProperty({type: String, example: '0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d'})
  address: string = null;

  @ApiProperty({type: String, example: 'Wrapped Ethereum'})
  name: string = null; // WETH

  @ApiProperty({type: String, example: 'WETH'})
  symbol: string = null;
  // balance total & user

  @ApiProperty({type: String, example: '4362346'})
  reserve: string = null;
  //
  @ApiProperty({type: Number, example: 1.2512})
  value: number = null; // Balance value // balance * price

  @ApiProperty({type: String, example: '123.6534'})
  balance: string = null; // string | Balance
  // price: Price = null; // value in currency [usd]
  @ApiProperty({type: Number, example: 345.12})
  price: number = null; // value in currency [usd]

  @ApiProperty({type: Number, example: 18})
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
  price?: number;

  @ApiProperty({ type: Number, example: 1.2512 })
  value?: number;

  @ApiProperty({ type: String, example: '123.6534' })
  balance?: string;
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

  // Claimable LP rewards
  rewards?: PoolTokenDto[] = [];

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
  value: string = null;
}

export class IntegrationClaimableTokenDto extends ERC20Token {
  @ApiProperty({type: ClaimableDto})
  claimableData?: ClaimableDto;

  @ApiProperty({type: String, example: 543.675})
  price?: number;
}

export class LPToken extends IntegrationERC20TokenDto {
  @ApiProperty({type: [PoolTokenDto]})
  tokens: PoolTokenDto[] = [];
}

export class LeverageFarmingPositionDto implements LeverageFarmingPosition {
  address: string;
  borrowToken: BorrowToken;
  debtRatio: number;
  earned: number;
  farmToken: LPToken | LeverageErcToken;

}

export class IntegrationStakingPositionDto {
  @ApiProperty({type: String, example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'})
  address: string = null;// vault address

  @ApiProperty({type: String, example: '6'})
  poolId: string = null; // number of pool - get from subgraph

  @ApiProperty({type: String, example: 'poolName'})
  poolName: string = null;

  @ApiProperty({type: String, example: '642354'})
  staked: string = null; // amount

  @ApiProperty({ type: LPToken })
  stakingToken: IntegrationERC20TokenDto | LPToken; // - lpToken info

  @ApiProperty({type: IntegrationClaimableTokenDto})
  rewardToken: IntegrationClaimableTokenDto; // for autofarm always will be one token(Token AUTOv2)
}

export class StakingPositionResponseDto {
  // @ApiProperty({type: String, example: '0x60de7f647df2448ef17b9e0123411724de6e373d'})
  // userAddress: string;

  @ApiProperty({type: String, example: 1329299651716364})
  totalValue: number;

  @ApiProperty({type: [IntegrationStakingPositionDto]})
  stakingPositions: IntegrationStakingPositionDto[] = [];
}

export class IntegrationLendingPositionsDto {
  @ApiProperty({type: String, example: '0x0000000000085d4780b73119b644ae5ecd22b3760xb53c1a33016b2dc2ff3653530bff1848a515c8c5'})
  id: string;

  @ApiProperty({type: String, example: '684096740209'})
  currentTotalBalance: string;

  @ApiProperty({type: String, example: '28139924983415244252223'})
  currentTotalDebt: string;

  @ApiProperty({type: String, example: '28139924983415244252223'})
  currentStableDebt: string;

  @ApiProperty({type: String, example: '28139924983415244252223'})
  currentVariableDebt: string;

  @ApiProperty({type: Number, example: '0.0287'})
  lendingAPY: number;

  @ApiProperty({type: Number, example: '0.0397'})
  stableBorrowAPY: number;

  @ApiProperty({type: Number, example: '0.1199'})
  variableBorrowAPY: number;

  @ApiProperty({ type: LPToken })
  token: IntegrationERC20TokenDto;
}

export class LendingPoolResponseDto {
  @ApiProperty({type: Number, example: 1329299651716364})
  totalBalance: number;

  @ApiProperty({type: Number, example: 1329299651716364})
  totalDebt: number;

  @ApiProperty({type: Number, example: 1.3})
  healthFactor: number;

  @ApiProperty({type: [IntegrationLendingPositionsDto]})
  lendingPositions: IntegrationLendingPositionsDto[];
}
