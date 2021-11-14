import { AbiItem } from 'web3-utils';

export class CallData {
  address: string;
  abi: AbiItem;
  id?: number;
  input: {
    data?: any[];
    plain?: string;
  };
  output: {
    data?: any;
    plain?: string;
  };
}
