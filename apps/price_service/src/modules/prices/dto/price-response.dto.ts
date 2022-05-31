import { ApiProperty } from '@nestjs/swagger';

import { ChainDto, CurrencyDto } from '@app/common';

export class PriceResponseDto<T> {
  @ApiProperty({ type: ChainDto })
  chain: ChainDto = null;

  @ApiProperty({ type: CurrencyDto })
  currency: CurrencyDto = null;

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
export interface HistoricalPricesPayloadV2 {
  [key: string]: { prices: TimestampKeyPrice; platform: string; isLp: boolean };
}

export type PricesPayload = CurrentPricesPayload | HistoricalPricesPayload;
