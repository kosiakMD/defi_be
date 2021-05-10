import { ApiProperty } from '@nestjs/swagger';

import { ChainDto } from '../balance/dto/chain.dto';
import { CurrencyDto } from '../balance/dto/currency.dto';

interface Chain {
  id: number;
  name: string;
}

interface Currency {
  id: number;
  name: string;
}

export interface PriceServiceResponse {
  prices: any;
  chain: Chain;
  currency: Currency;
}

export class PriceResponseDto<T> {
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
