import { ApiProperty } from '@nestjs/swagger';

import { ChainDto } from './chain.dto';
import { CurrencyDto } from './currency.dto';

export class PriceResponseDto<T> {
  @ApiProperty({ type: ChainDto })
  chain: ChainDto;

  @ApiProperty({ type: CurrencyDto })
  currency: CurrencyDto;

  @ApiProperty({
    type: Object,
    example: {
      '0xbddab785b306bcd9fb056da189615cc8ece1d823': {
        1630917717: 0.00049968,
        1630918017: 0.00049968,
      },
    },
  })
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
