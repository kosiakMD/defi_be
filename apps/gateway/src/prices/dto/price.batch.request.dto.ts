// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class TokenPriceRequest {
  @IsNotEmpty()
  @ApiProperty({
    type: () => String,
    required: true,
    description: 'Asset / token address',
  })
  address: string;

  @IsNotEmpty()
  @IsInt({ each: true })
  @ApiProperty({
    type: () => [Number],
    required: true,
    description: 'Array of timestamps for historical prices',
  })
  timestamps: number[];
}

export class PriceBatchRequestDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Chain or network id',
    default: 1,
  })
  chain = 1;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Currency Id',
    default: 1,
  })
  currency = 1;

  @IsNotEmpty()
  @IsArray()
  @Type(() => TokenPriceRequest)
  @ApiProperty({
    type: () => [TokenPriceRequest],
    required: true,
    description: 'Array of token / coin price requests',
    default: [
      {
        address: '0xbddab785b306bcd9fb056da189615cc8ece1d823',
        timestamps: [1617138000, 1617224400],
      },
      {
        address: '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
        timestamps: [1617224400],
      },
    ],
  })
  assets: TokenPriceRequest[];
}
