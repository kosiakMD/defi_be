import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, CurrencyIdEnum } from '@app/common';

export class PriceTimestampRequestDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Chain or network id',
    default: ChainIdEnum.eth,
  })
  chain = ChainIdEnum.eth;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Currency Id',
    default: CurrencyIdEnum.usd,
  })
  currency = CurrencyIdEnum.usd;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Timestamp',
    default: 1633330800,
  })
  timestamp: number;

  @IsNotEmpty()
  @IsArray()
  @Type(() => String)
  @ApiProperty({
    type: () => [String],
    required: true,
    description: 'Array of token / coin price requests',
    default: [
      '0xbddab785b306bcd9fb056da189615cc8ece1d82',
      '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
    ],
  })
  assets: string[];
}
