import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, CurrencyIdEnum } from '../../common/enum';

export class PriceRequestCurrentDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    type: String,
    description: 'Asset / token address',
    example: '0xf5d669627376ebd411e34b98f19c868c8aba5ada',
  })
  address: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    type: Number,
    description: 'Asset price',
    example: '0.00345',
  })
  price: number;

  @IsNotEmpty()
  @IsInt()
  @ApiProperty({
    type: Number,
    description: 'Chain or network id',
    example: ChainIdEnum.eth,
  })
  chainId: ChainIdEnum;

  @IsNotEmpty()
  @IsInt()
  @ApiProperty({
    type: Number,
    description: 'Currency Id',
    example: CurrencyIdEnum.usd,
  })
  currencyId: CurrencyIdEnum;
}
