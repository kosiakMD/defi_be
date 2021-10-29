import { ChainDto } from '.';

export class ProtocolDto {}

export interface DefaultDataProvider {
  [key: string]: any;
  getDataByAddresses: (address: string, chain: ChainDto) => any;
}
