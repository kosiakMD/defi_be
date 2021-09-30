// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, CurrencyIdEnum } from '../../common/enum';

import { PriceRangePeriod } from '../prices.enum';

export class PriceRangeRequestDto {
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

  @IsNotEmpty()
  @IsString({ each: true })
  @ApiProperty({
    type: String,
    required: true,
    description: 'Array of token / coin addresses (comma separated)',
    example:
      '0xbddab785b306bcd9fb056da189615cc8ece1d823,0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
    default:
      '0xbddab785b306bcd9fb056da189615cc8ece1d823,0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
  })
  addresses: string;

  @Type(() => String)
  @IsString()
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: 'Period Range',
    example: PriceRangePeriod.day,
    default: PriceRangePeriod.day,
  })
  range = PriceRangePeriod.day;
}
