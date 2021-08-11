// eslint-disable-next-line max-classes-per-file
import { Expose, Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { Address, Chains } from '../../common/interfaces';
import { ChainIdEnum } from 'src/common/enum';

import { Asset, AssetState } from '../assets.interface';

export class AssetDto implements Asset {
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
  @Expose()
  chain: ChainIdEnum;

  @ApiProperty({ type: Number, example: 18 })
  @Expose()
  decimals: number;

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
  chains: Chains = [ChainIdEnum.eth];
}

export type ChainAssets = Record<ChainIdEnum, AssetDto[]>;

export class AssetResponseDto {
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
  chainId: ChainIdEnum;

  @ApiProperty({ type: Number, example: 18 })
  @Expose()
  decimals: number;

  @ApiProperty({ type: Boolean, example: true })
  @Expose({ name: 'isMigrated' })
  isTracked: boolean;
}
