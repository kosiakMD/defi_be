// eslint-disable-next-line max-classes-per-file
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { splitToArrayAndUnify } from '../../../common/utils/transform';

import { PriceRangePeriod } from '../prices.enum';

export class PriceRangeRequestDto {
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
  @IsString({ each: true })
  @Transform(({ value }) => splitToArrayAndUnify(value))
  @ApiProperty({
    type: String,
    required: true,
    description: 'Array of token / coin addresses (comma separated)',
    example:
      '0xbddab785b306bcd9fb056da189615cc8ece1d823,0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
    default:
      '0xbddab785b306bcd9fb056da189615cc8ece1d823,0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
  })
  addresses: string[];

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
