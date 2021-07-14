import { ApiProperty } from '@nestjs/swagger';

import { ChainDto, CurrencyDto } from '../../lookup/dto';

export class PriceResponseDto<T> {
  @ApiProperty({ type: ChainDto })
  chain: ChainDto;

  @ApiProperty({ type: CurrencyDto })
  currency: CurrencyDto;

  @ApiProperty({ type: Object })
  prices: T;
}

export interface CurrentPricesPayload {
  [key: string]: number;
}

export interface CurrentPricesPayloadV2 {
  [key: string]: { price: number; platform: string; isLp: boolean };
}

export interface TimestampKeyPrice {
  [key: string]: number;
}

export interface HistoricalPricesPayload {
  [key: string]: TimestampKeyPrice;
}
export interface HistoricalPricesPayloadV2 {
  [key: string]: { prices: TimestampKeyPrice; platform: string; isLp: boolean };
}

export type PricesPayloadV2 = CurrentPricesPayloadV2 | HistoricalPricesPayloadV2;
export type PricesPayload = CurrentPricesPayload | HistoricalPricesPayload;
