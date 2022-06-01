import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AssetCategoryDto } from './asset-category.dto';
import { AssetHistoricalPriceDto } from './asset-historical-price.dto';
import { AssetUnderlyingDto } from './asset-underlying.dto';

@Exclude()
export class AssetDto {
  @Expose()
  @ApiProperty({ type: Number, example: 1011 })
  id: number;

  @Expose()
  @ApiProperty({ type: Number, example: 10 })
  chainId: number;

  @Expose()
  @ApiProperty({ type: String, example: '0xe41d2489571d322189246dafa5ebde1f4699f498' })
  address: string;

  @Expose()
  @ApiProperty({ type: String, nullable: true })
  name?: string;

  @Expose()
  @ApiProperty({ type: String, nullable: true })
  symbol?: string;

  @Expose()
  @ApiProperty({ type: Number })
  price?: number;

  @Expose()
  @ApiProperty({ type: Number, nullable: true })
  rank?: number;

  @Expose()
  @ApiProperty({ type: String, nullable: true })
  icon?: string;

  @Expose()
  @ApiProperty({ type: Number, nullable: false })
  decimals: number;

  @ApiProperty({ type: Boolean, default: false })
  isTracked: boolean;

  @ApiProperty({ type: Boolean, nullable: false, default: false })
  disabled: boolean;

  @Expose()
  @ApiProperty({ type: [AssetCategoryDto] })
  categories: AssetCategoryDto[] = [];

  @Expose()
  @ApiProperty({ type: [AssetHistoricalPriceDto] })
  historicalPrices: AssetHistoricalPriceDto[] = [];

  @Expose()
  @ApiProperty({ type: [AssetUnderlyingDto] })
  underlying: AssetUnderlyingDto[] = [];
}
