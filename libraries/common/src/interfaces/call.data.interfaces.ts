import { AbiItem } from 'web3-utils';

export interface IInputOutput {
  data?: any;
  plain?: string;
}

export interface ICallData {
  address: string;
  abi: AbiItem;
  id?: number;
  input: IInputOutput;
  output: IInputOutput;
}
