import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { formatAddress } from '@app/common/utils';

export class GetAssetRequest {
  @ApiProperty({
    type: Number,
    description: 'Text to search assets by name or symbol',
    example: 1,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => +value)
  chainId: number;

  @ApiProperty({
    type: String,
    description: 'Address to get or process an asset',
    example: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => formatAddress(value))
  address: string;

  @ApiProperty({
    type: [Number],
    description: 'Timestamps on which historical prices have to be returned',
    required: false,
  })
  pricesAt?: number[];

  @ApiProperty({
    type: Boolean,
    description: 'Flag to forcefully re-process (re-fetch) asset data',
    required: false,
    default: false,
  })
  @Transform(({ value }) => value?.toLowerCase() === 'true')
  forceUpdate?: boolean;
}
