import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { splitToArray, splitToNumberArray } from '../../utils/transform';

export class PriceQueryDto {
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
  @Transform(({ value }) => splitToArray(value))
  @ApiProperty({
    type: String,
    required: true,
    description: 'Array of token / coin addresses (comma separated)',
    default:
      '0xbddab785b306bcd9fb056da189615cc8ece1d823,0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
  })
  addresses: string[];

  @IsOptional()
  @IsInt({ each: true })
  @Transform(({ value }) => splitToNumberArray(value))
  @ApiProperty({
    type: String,
    required: false,
    description: 'Array of timestamps for historical prices (comma separated)',
    default: '1617138000,1617224400',
  })
  timestamps: number[];
}
