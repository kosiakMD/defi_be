import { IAssetResponseDto } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class AssetResponseDto implements IAssetResponseDto {
  @ApiProperty({ type: Number, example: 1066834 })
  @Expose()
  id: number;

  @ApiProperty({ type: String, example: '0xe41d2489571d322189246dafa5ebde1f4699f498' })
  @Expose()
  address: string;

  @ApiProperty({ type: String, example: '0x Protocol Token' })
  @Expose()
  name: string;

  @ApiProperty({ type: String, example: 'ZRX' })
  @Expose()
  symbol: string;

  @ApiProperty({ example: 1 })
  @Expose({ name: 'chain' })
  chain: number;

  @ApiProperty({ type: Number, example: 18 })
  @Expose()
  decimals: number;

  @ApiProperty({ type: Boolean, example: true })
  @Expose()
  @Transform(({ value }) => Boolean(value))
  isLp = false;

  @ApiProperty({ type: Boolean, example: true })
  @Expose()
  isTracked: boolean;

  @Expose()
  positionInPool?: number;

  @Expose()
  underlyingAssets?: AssetResponseDto[];
}