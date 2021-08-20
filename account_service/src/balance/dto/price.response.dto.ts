import { ApiProperty } from '@nestjs/swagger';

import { Address } from 'src/common/interfaces';

import { PriceServiceResponse } from '../../price/price.interfaces';
import { ChainDto } from './chain.dto';
import { CurrencyDto } from './currency.dto';

export class PriceResponseDto<T> implements PriceServiceResponse<T> {
  constructor(chain, currency, prices) {
    this.chain = chain;
    this.currency = currency;
    this.prices = prices;
  }

  @ApiProperty({ type: ChainDto, required: false })
  chain?: ChainDto;

  @ApiProperty({ type: CurrencyDto, required: false })
  currency?: CurrencyDto;

  @ApiProperty({ type: Object })
  prices: T;
}

export interface CurrentPricesPayload {
  [key: string]: number;
}

export type Timestamp = string;

export type HistoricalPrices = Record<Timestamp, number | null>;

export type HistoricalPricesMap = Map<Address, HistoricalPrices>;

export type TokenHistoricalPrice = Record<Address, HistoricalPrices>;

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
