// eslint-disable-next-line max-classes-per-file
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, CurrencyIdEnum } from '../../common/enum';

export class TokenPriceRequest {
  @IsNotEmpty()
  @ApiProperty({
    type: () => String,
    required: true,
    description: 'Asset / token address',
    example: '0xf5d669627376ebd411e34b98f19c868c8aba5ada',
  })
  address: string;

  @IsNotEmpty()
  @IsInt({ each: true })
  @ApiProperty({
    type: () => [Number],
    required: true,
    description: 'Array of timestamps for historical prices',
    example: [1626180883227],
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
