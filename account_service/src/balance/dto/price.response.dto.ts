import { ApiProperty } from '@nestjs/swagger';

import { Address } from '../../common/interfaces';
import { PriceServiceResponse } from '../../price/price.interfaces';
import { ChainDto } from './chain.dto';
import { CurrencyDto } from './currency.dto';

export class PriceResponseDto<T> implements PriceServiceResponse<T> {
  constructor(chain, currency, prices) {
    this.chain = chain;
    this.currency = currency;
    this.prices = prices;
  }

  @ApiProperty()
  chain?: ChainDto;

  @ApiProperty()
  currency?: CurrencyDto;

  @ApiProperty()
  prices: T;
}

export interface CurrentPricesPayload {
  [key: string]: number;
}

export type Platform = string;

export type Timestamp = string;

export type HistoricalPrice = Map<Timestamp, number | null>;

export interface PlatformHistoricalPrices {
  prices: HistoricalPrice;
  platform: Platform;
  isLp: boolean;
}

export type TokenHistoricalPrice = Record<Address, PlatformHistoricalPrices>;

export interface PricesDto {
  chain: {
    id: number;
    name: string;
  };
  currency: {
    id: number;
    name: string;
  };
  prices: TokenHistoricalPrice;
}
