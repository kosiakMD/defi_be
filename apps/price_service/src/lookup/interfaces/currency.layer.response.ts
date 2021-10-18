import { CurrencyLayerResponseFailure } from './currency.layer.response.failure';
import { CurrencyLayerResponseSuccess } from './currency.layer.response.success';

export type CurrencyLayerResponse = CurrencyLayerResponseSuccess | CurrencyLayerResponseFailure;
