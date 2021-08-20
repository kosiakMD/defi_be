// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { Address } from '../common/interfaces';
import { CurrencyId, Timestamp } from '../common/types';
import { ChainIdEnum, CurrencyIdEnum } from 'src/common/enum';

import { ChainDto } from '../balance/dto/chain.dto';
import { CurrencyDto } from '../balance/dto/currency.dto';
import { CurrentTokensPrices, PriceServiceResponse } from './price.interfaces';

export class PriceCurrentRequestDto {
  constructor(addresses: Address[], chain: ChainIdEnum, currency: CurrencyId) {
    this.addresses = addresses;
    this.chain = chain;
    this.currency = currency;
  }

  @ApiProperty({
    type: [String],
    example: [
      '0xf5d669627376ebd411e34b98f19c868c8aba5ada',
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    ],
  })
  addresses: Address[];

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chain: ChainIdEnum;

  @ApiProperty({ type: Number, example: 1 })
  currency?: CurrencyId;
}

export class PriceHistoricalRequestDto extends PriceCurrentRequestDto {
  constructor(
    addresses: Address[],
    timestamps: Timestamp[],
    chain: ChainIdEnum,
    currency: CurrencyId,
  ) {
    super(addresses, chain, currency);
    this.timestamps = timestamps;
  }

  @ApiProperty({
    type: [String],
    example: [
      '0xf5d669627376ebd411e34b98f19c868c8aba5ada',
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    ],
  })
  addresses: Address[];

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chain: ChainIdEnum;

  @ApiProperty({ enum: CurrencyIdEnum, enumName: 'CurrencyIdEnum', example: CurrencyIdEnum.usd })
  currency?: CurrencyIdEnum;

  @ApiProperty({ type: [String], example: ['1626178227726', '1626178458384'] })
  timestamps: Timestamp[];
}

export class PriceResponseDto<T> implements PriceServiceResponse<T> {
  @ApiProperty({ type: ChainDto, required: false })
  chain?: ChainDto;

  @ApiProperty({ type: CurrencyDto, required: false })
  currency?: CurrencyDto;

  @ApiProperty({ type: Object })
  prices: T;
}

export class CurrentTokensPricesDto implements CurrentTokensPrices {
  @ApiProperty({ type: Boolean, example: true })
  isLp = false;
  @ApiProperty({ type: String, example: 'COINGECKO' })
  platform: string = null;
  @ApiProperty({ type: String, example: 1233 })
  price: number = null;
}

export class NoDbTokenPricesDto {
  @ApiProperty({ type: String, example: '0xf5d669627376ebd411e34b98f19c868c8aba5ada' })
  address: string = null;
  @ApiProperty({ type: Number, example: 1233 })
  price: number = null;
}
