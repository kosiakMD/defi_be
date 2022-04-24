import { classToPlain, Exclude, Expose, plainToClass } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AssetsCategoryDto } from './AssetsCategory.dto';
import { AssetsPriceDto } from './AssetsPrice.dto';
import { AssetUnderlyingDto } from './AssetsUnderlying.dto';

@Exclude()
export class AssetDto {
  @Expose()
  @ApiProperty({ type: Number, example: 1011 })
  id: number;

  @Expose()
  @ApiProperty({ type: String, example: '0xe41d2489571d322189246dafa5ebde1f4699f498' })
  address: string;

  @Expose()
  @ApiProperty({ type: String, nullable: true })
  public name: string;

  @Expose()
  @ApiProperty({ type: String, nullable: true })
  public symbol: string;

  @Expose()
  @ApiProperty({ type: String, nullable: true })
  public icon: string;

  @Expose()
  @ApiProperty({ type: Number, example: 10 })
  chainId: number;

  @Expose()
  @ApiProperty({ type: Number, name: 'decimals', nullable: false })
  public decimals: number;

  @ApiProperty({ type: Boolean, name: 'is_tracked', default: false })
  public isTracked: boolean;

  @ApiProperty({ type: Boolean, nullable: false, default: false })
  public disabled: boolean;

  @Expose()
  @ApiProperty({ type: AssetsCategoryDto })
  public category: AssetsCategoryDto;

  @Expose()
  @ApiProperty({ type: [AssetsPriceDto] })
  public prices: AssetsPriceDto[];

  @Expose()
  @ApiProperty({ type: [AssetUnderlyingDto] })
  public underlyingTokens: AssetUnderlyingDto[];

  @Expose()
  @ApiProperty({ type: Number })
  public averagePrice?: number;

  @Expose()
  @ApiProperty({ type: Number, default: -1 })
  public rank: number;

  toJSON() {
    return classToPlain({
      ...this,
      ...{ category: plainToClass(AssetsCategoryDto, this.category) },
    });
  }
}
