import { ChainDto } from 'src/dto/chain.dto';
import { CurrencyDto } from 'src/dto/currency.dto';

import { ApiProperty } from '@nestjs/swagger';

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

export interface TimestampKeyPrice {
  [key: string]: number;
}

export interface HistoricalPricesPayload {
  [key: string]: TimestampKeyPrice;
}

export type PricesPayload = CurrentPricesPayload;
