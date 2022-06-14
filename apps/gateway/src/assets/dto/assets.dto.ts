// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum } from '@app/common/enum';

enum AssetState {
  pending = 'pending',
  processing = 'processing',
  ready = 'ready',
}

export class AssetsDto {
  @ApiProperty({ type: Number, example: 13 })
  id: number;

  @ApiProperty({ type: String, example: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' })
  address: string;

  @ApiProperty({ type: String, example: 'Aave' })
  name: string;

  @ApiProperty({ type: String, example: 'AAVE' })
  symbol: string;

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chain: ChainIdEnum;

  @ApiProperty({ type: Number, example: 18 })
  decimals: number;

  @ApiProperty({ enum: AssetState, enumName: 'AssetState', example: AssetState.processing })
  status: AssetState;
}

export class AssetResponseDto {
  @ApiProperty({ type: Number, example: 1066834 })
  id: number;

  @ApiProperty({ type: String, example: '0xe41d2489571d322189246dafa5ebde1f4699f498' })
  address: string;

  @ApiProperty({ type: String, example: '0x Protocol Token' })
  name: string;

  @ApiProperty({ type: String, example: 'ZRX' })
  symbol: string;

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chainId: ChainIdEnum;

  @ApiProperty({ type: Number, example: 18 })
  decimals: number;

  @ApiProperty({ type: Boolean, example: true })
  isTracked: boolean;
}
