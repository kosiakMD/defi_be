import { ChainIdEnum, CurrencyIdEnum, Address } from '@app/common';

export interface IPriceRequestCurrent {
  address: Address;
  price: number;
  chainId: ChainIdEnum;
  currencyId: CurrencyIdEnum;
}
