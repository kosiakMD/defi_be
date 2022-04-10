import { ChainIdEnum, CurrencyIdEnum } from '../enum';
import { Address } from '../types';

export interface IPriceRequestCurrent {
  address: Address;
  price: number;
  chainId: ChainIdEnum;
  currencyId: CurrencyIdEnum;
}
