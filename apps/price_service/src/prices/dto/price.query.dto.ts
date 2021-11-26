import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, CurrencyIdEnum } from '@app/common/enum';

import { splitToArrayAndUnify } from '../../utils/transform';

export class PriceQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @ApiProperty({
    enum: ChainIdEnum,
    example: ChainIdEnum.eth,
    default: ChainIdEnum.eth,
    required: false,
    description: 'Chain or network id',
  })
  chain = ChainIdEnum.eth;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @ApiProperty({
    enum: CurrencyIdEnum,
    example: CurrencyIdEnum.usd,
    default: CurrencyIdEnum.usd,
    description: 'Currency Id',
    required: false,
  })
  currency = CurrencyIdEnum.usd;

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
}
