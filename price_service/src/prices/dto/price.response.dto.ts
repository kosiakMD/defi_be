import { ApiProperty } from '@nestjs/swagger';

import { ChainDto, CurrencyDto } from '../../lookup/dto';

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

export interface HistoricalPricesPayload {
  [key: string]: TimestampPrice;
}

export interface TimestampPrice {
  [key: string]: number;
}

export type PricesPayload = CurrentPricesPayload | HistoricalPricesPayload;
