import { ChainIdEnum } from '../common/enum';

export class ProtocolDto {}

export interface DefaultDataProvider {
  [key: string]: any;
  getDataByAddresses: (address: string, chainId?: ChainIdEnum) => any;
}
