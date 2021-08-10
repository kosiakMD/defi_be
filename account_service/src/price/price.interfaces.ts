import {
  ChainIdEnum,
  ChainNameEnum,
  ChainSymbols,
  CurrencyEnum,
  CurrencyIdEnum,
} from '../common/enum';

import { HistoricalPricesMap } from '../balance/dto/price.response.dto';

export interface Chain {
  id: ChainIdEnum;
  name: ChainNameEnum;
  symbol: ChainSymbols;
}

export interface Currency {
  id: CurrencyIdEnum;
  name: CurrencyEnum;
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
