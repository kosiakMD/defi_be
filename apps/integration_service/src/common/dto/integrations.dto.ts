// eslint-disable-next-line max-classes-per-file
import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { IntegrationClaimableTokenDto } from '@app/common';

import { Stats } from '../../modules/integration/dto/integrations.dto';

@Exclude()
export class PoolTokenDto {
  @ApiProperty({ type: String, example: '0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d' })
  @Expose()
  address: string = null;

  @ApiProperty({ type: String, example: 'Wrapped Ethereum' })
  @Expose()
  name: string = null; // WETH

  @ApiProperty({ type: String, example: 'WETH' })
  @Expose()
  symbol: string = null;
  // balance total & user

  @ApiProperty({ type: String, example: '4362346' })
  @Expose()
  reserve: string = null;
  //
  @ApiProperty({ type: Number, example: 1.2512 })
  @Expose()
  value: number = null; // Balance value // balance * price

  @ApiProperty({ type: String, example: '123.6534' })
  @Expose()
  balance: string = null; // string | Balance
  // price: Price = null; // value in currency [usd]

  @ApiProperty({ type: Number, example: 345.12 })
  @Expose()
  price: number = null; // value in currency [usd]

  @ApiProperty({ type: Number, example: 18 })
  @Expose()
  decimals: number = null;
}

export class IntegrationERC20TokenDto {
  @ApiProperty({ type: String, example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' })
  address: string = null;

  @ApiProperty({ type: String, example: 'Binance Coin' })
  name: string = null;

  @ApiProperty({ type: String, example: 'BNB' })
  symbol: string = null;

  @ApiProperty({ type: Number, example: 18 })
  decimals: number = null;

  @ApiProperty({ type: String, example: '1243522' })
  totalSupply?: string = null;

  @ApiProperty({ type: Number, example: 3759.23 })
  price?: number = null;

  @ApiProperty({ type: Number, example: 1.2512 })
  value?: number = null;

  @ApiProperty({ type: String, example: '123.6534' })
  balance?: string = null;

  /**
   * If LP token
   */
  @ApiProperty({ type: [PoolTokenDto] })
  tokens?: PoolTokenDto[];
}

export class LPToken extends IntegrationERC20TokenDto {
  @ApiProperty({ type: [PoolTokenDto] })
  tokens: PoolTokenDto[] = [];
}

// TODO: same as StakingPoolFeature!!!
export class IntegrationStakingPositionDto {
  @Expose()
  @ApiProperty({ type: String, example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' })
  address: string = null; // vault address

  @Expose()
  @ApiProperty({ type: String, example: '6' })
  poolId: string = null; // number of pool - get from subgraph

  @Expose()
  @ApiProperty({ type: String, example: 'poolName' })
  poolName: string = null;

  @Expose()
  @ApiProperty({ type: String, example: '642354' })
  staked: string = null; // amount

  @Expose()
  @ApiProperty({ type: Stats })
  stats?: Stats;

  @Expose()
  @ApiProperty({ type: LPToken })
  stakingToken: IntegrationERC20TokenDto; // - lpToken info

  // TODO: remove rewardToken (use rewards instead)
  @Expose()
  @ApiProperty({ type: IntegrationClaimableTokenDto })
  rewardToken?: IntegrationClaimableTokenDto;

  @Expose()
  @ApiProperty({ type: IntegrationClaimableTokenDto })
  rewards?: IntegrationClaimableTokenDto[];
}

export class StakingPositionResponseDto {
  @ApiProperty({ type: String, example: 1329299651716364 })
  totalValue: number;

  @ApiProperty({ type: [IntegrationStakingPositionDto] })
  stakingPositions: IntegrationStakingPositionDto[];
}
