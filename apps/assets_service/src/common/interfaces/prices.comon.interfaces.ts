import { Chain, Currency } from './index';

export interface PriceServiceResponse<T> {
  chain?: Chain;
  currency?: Currency;
  prices: T;
}
