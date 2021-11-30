import { Address, ChainIdEnum, CurrencyIdEnum } from '@app/common';
import { IPriceRequestCurrent } from '@app/common/interfaces/price.request.current';

export class PriceRequestCurrentDto implements IPriceRequestCurrent {
  address: Address;
  price: number;
  chainId: ChainIdEnum;
  currencyId: CurrencyIdEnum;
}
