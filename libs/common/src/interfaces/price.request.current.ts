import { Address, ChainIdEnum, CurrencyIdEnum } from '@app/common';

export interface IPriceRequestCurrent {
  address: Address;
  price: number;
  chainId: ChainIdEnum;
  currencyId: CurrencyIdEnum;
}
