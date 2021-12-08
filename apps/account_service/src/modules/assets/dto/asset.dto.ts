// eslint-disable-next-line max-classes-per-file
import { Expose, Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { IAssetDto, IAssetResponseDto } from '@app/common';
import { AssetState, ChainIdEnum } from '@app/common/enum';
import { unifyAddress } from '@app/common/utils/addresses';

import { Address } from '../../../common/interfaces';

export class AssetDto implements IAssetDto {
  @ApiProperty({ type: Number, example: 1066834 })
  @Expose()
  id: number;

  @ApiProperty({ type: String, example: '0xe41d2489571d322189246dafa5ebde1f4699f498' })
  @Expose()
  address: string;

  @ApiProperty({ type: String, example: '0x Protocol Token' })
  @Expose()
  name: string = null;

  @ApiProperty({ type: String, example: 'ZRX' })
  @Expose()
  symbol: string = null;

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  @Expose()
  chain: ChainIdEnum;

  @ApiProperty({ type: Number, example: 18 })
  @Expose()
  decimals: number;

  @ApiProperty({ type: Boolean, example: false })
  @Expose()
  isLp: boolean = false;

  @ApiProperty({ enum: AssetState, enumName: 'AssetState', example: AssetState.pending })
  @Expose()
  status: AssetState;
}

export class AssetQueryDto {
  @IsNotEmpty()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    return value;
  })
  @IsString({ each: true })
  addresses: Address[];

  @IsOptional()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    return value.map((x) => parseInt(x, 10));
  })
  @IsArray()
  @IsInt({ each: true })
  @ApiProperty({
    type: [Number],
    example: [ChainIdEnum.eth, ChainIdEnum.bsc],
  })
  chains: ChainIdEnum[] = [ChainIdEnum.eth];
}

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

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  @Expose({ name: 'chain' })
  chain: ChainIdEnum;

  @ApiProperty({ type: Number, example: 18 })
  @Expose()
  decimals: number;

  @ApiProperty({ type: Boolean, example: true })
  @Expose()
  @Transform(({ value }) => {
    return !!value;
  })
  isLp = false;

  @ApiProperty({ type: Boolean, example: true })
  @Expose()
  isTracked: boolean;

  @Expose()
  positionInPool?: number;

  @Expose()
  underlyingAssets?: AssetResponseDto[];
}

export class AssetTrackDto {
  @Expose()
  @IsNotEmpty()
  @Transform(({ value }) => {
    return unifyAddress(value);
  })
  @ApiProperty({ type: String, example: '0xf411903cbc70a74d22900a5de66a2dda66507255' })
  address: string;

  @Expose()
  @IsNotEmpty()
  @ApiProperty({ type: Number, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chain: ChainIdEnum;
}
