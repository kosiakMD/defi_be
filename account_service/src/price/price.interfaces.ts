import { HistoricalPricesMap } from '../balance/dto/price.response.dto';
import { ChainId, CurrencyId } from '../common/types';

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

export type PriceServiceHistoricalResponse = PriceServiceResponse<HistoricalPricesMap>;

export interface CurrentPricesPayload {
  [key: string]: number;
}
