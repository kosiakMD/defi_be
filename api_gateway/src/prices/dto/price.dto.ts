// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { splitToArray, splitToNumberArray } from '../../utils/transform';
import { PriceQuery } from '../interfaces/price.interfaces';

export class CurrencyDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'usd' })
  name: string;
}

export class ChainDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ethereum' })
  name: string;
}

export class PriceDto<T> {
  @ApiProperty({
    example: {
      id: 1,
      name: 'ethereum',
    },
  })
  chain: ChainDto;

  @ApiProperty({
    example: {
      id: 1,
      name: 'usd',
    },
  })
  currency: CurrencyDto;

  @ApiProperty({
    type: Object,
    example: {
      '0xbddab785b306bcd9fb056da189615cc8ece1d823': {},
      '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643': {
        '1617138000': 0.021393818603312378,
        '1617224400': 0.02132339638255597,
      },
    },
  })
  prices: T;
}

export class PriceResponseDto<T> {
  @ApiProperty()
  chain: ChainDto;

  @ApiProperty()
  currency: CurrencyDto;

  @ApiProperty()
  prices: T;
}

// TODO: Validation not finished here...
export class PriceQueryDto implements PriceQuery {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Chain or network Id',
    default: 1,
    example: 1,
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
    example: 1,
  })
  currency = 1;

  @IsNotEmpty()
  @IsString({ each: true })
  @Transform(({ value }) => splitToArray(value))
  @ApiProperty({
    type: String,
    required: true,
    description: 'Array of token / coin addresses (comma separated)',
    example:
      '0xbddab785b306bcd9fb056da189615cc8ece1d823,0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
    // examples: [
    //   {
    //     historical:
    //       '0xbddab785b306bcd9fb056da189615cc8ece1d823,0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
    //   },
    //   {
    //     current:
    //       '0x0000000000000000000000000000000000000000,0x0000000000000000000000000000000000000000',
    //   },
    // ],
  })
  addresses: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => splitToNumberArray(value))
  @ApiProperty({
    type: String,
    required: false,
    description: 'Array of timestamps for historical prices (comma separated)',
    example: '1617138000,1617224400',
    // examples: [{ historical: '1617138000,1617224400' }, { current: '' }],
  })
  timestamps: string;
}
