import { ApiProperty } from '@nestjs/swagger';

export class PriceResponseDto<T> {
  @ApiProperty()
  chain: ChainDto;

  @ApiProperty()
  currency: CurrencyDto;

  @ApiProperty()
  prices: T;
}

export class ChainDto {
  id: number;
  name: string;
}

export class CurrencyDto {
  id: number;
  name: string;
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

export type PricesPayload = CurrentPricesPayload;
