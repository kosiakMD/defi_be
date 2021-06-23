// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ChainDto } from '../balance/dto/chain.dto';
import { CurrencyDto } from '../balance/dto/currency.dto';
import { Address } from '../common/interfaces';
import { ChainId, CurrencyId, Timestamp } from '../common/types';
import { PriceServiceResponse } from './price.interfaces';

export class PriceCurrentRequestDto {
  constructor(addresses: Address[], chain: ChainId, currency: CurrencyId) {
    this.addresses = addresses;
    this.chain = chain;
    this.currency = currency;
  }
  addresses: Address[];
  chain: ChainId;
  currency?: CurrencyId;
}

export class PriceHistoricalRequestDto extends PriceCurrentRequestDto {
  constructor(addresses: Address[], timestamps: Timestamp[], chain: ChainId, currency: CurrencyId) {
    super(addresses, chain, currency);
    this.timestamps = timestamps;
  }
  addresses: Address[];
  chain: ChainId;
  currency?: CurrencyId;
  timestamps: Timestamp[];
}

export class PriceResponseDto<T> implements PriceServiceResponse<T> {
  @ApiProperty()
  chain?: ChainDto;

  @ApiProperty()
  currency?: CurrencyDto;

  @ApiProperty()
  prices: T;
}
