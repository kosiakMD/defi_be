import { ApiProperty } from '@nestjs/swagger';
import { ChainDto } from './chain.dto';
import { CurrencyDto } from './currency.dto';

export class PriceResponseDto<T> {
  @ApiProperty()
  chain: ChainDto;

  @ApiProperty()
  currency: CurrencyDto;

  @ApiProperty()
  prices: T;
}

export interface CurrentPricesPayload {
  [key: string]: number;
}

export interface TimestampKeyPrice {
  [key: string]: number;
}

export interface HistoricalPricesPayload {
  [key: string]: TimestampKeyPrice;
}

export type PricesPayload = CurrentPricesPayload | HistoricalPricesPayload;
