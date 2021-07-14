import { ApiProperty } from '@nestjs/swagger';

import { ChainDto } from './chain.dto';
import { CurrencyDto } from './currency.dto';

export class PriceResponseDto<T> {
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
