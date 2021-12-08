import { EtherscanTransfer } from '../../../common/interfaces/ether.scan.interfaces';

export interface Transfers {
  [key: string]: EtherscanTransfer[];
}
