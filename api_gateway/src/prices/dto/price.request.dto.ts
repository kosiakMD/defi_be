import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { BadRequestException } from '@nestjs/common/exceptions';
import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, CurrencyIdEnum } from 'src/common/enum';

export class PriceRequestDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @ApiProperty({
    enum: CurrencyIdEnum,
    enumName: 'CurrencyIdEnum',
    required: false,
    description: 'Chain or network id',
    default: CurrencyIdEnum.usd,
  })
  chain: CurrencyIdEnum = CurrencyIdEnum.usd;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @ApiProperty({
    enum: ChainIdEnum,
    enumName: 'ChainIdEnum',
    required: false,
    description: 'Currency Id',
    default: ChainIdEnum.eth,
  })
  currency: ChainIdEnum = ChainIdEnum.eth;

  @IsNotEmpty()
  @IsString({ each: true })
  @ApiProperty({
    type: () => [String],
    required: true,
    description: 'Array of token / coin addresses',
    default: [
      '0xbddab785b306bcd9fb056da189615cc8ece1d823',
      '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
    ],
  })
  addresses: string[];

  @IsOptional()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    return value.map((x) => parseInt(x));
  })
  @IsInt({ each: true })
  @ApiProperty({
    type: () => [Number],
    required: false,
    description: 'Array of timestamps for historical prices (comma separated)',
    default: [1617138000, 1617224400],
  })
  timestamps: number[];
}
