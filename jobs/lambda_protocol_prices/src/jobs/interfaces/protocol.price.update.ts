import { ChainIdEnum } from '@app/common';
import { IPriceRequestCurrent } from '@app/common/interfaces/price.request.current';

export interface IProtocolPriceUpdate {
  chains: ChainIdEnum[];
  update(): Promise<IPriceRequestCurrent[]>;
}
