import { ChainId, CurrencyId } from 'src/common/types';

import { HistoricalPricesMap } from '../balance/dto/price.response.dto';

interface Chain {
  id: ChainId;
  name: string;
}

interface Currency {
  id: CurrencyId;
  name: string;
}

export interface PriceServiceResponse<T> {
  chain?: Chain;
  currency?: Currency;
  prices: T;
}

export interface CurrentTokensPrices {
  price: number;
  platform: string;
  isLp: boolean;
}

export interface CurrentPricesPayloadNew {
  [key: string]: CurrentTokensPrices;
}

export type PriceServiceHistoricalResponse = PriceServiceResponse<HistoricalPricesMap>;

export interface CurrentPricesPayload {
  [key: string]: number;
}
