import { AbiItem } from 'web3-utils';

export interface IInputOutput<T = any> {
  data?: T;
  plain?: string;
}

export interface ICallData<TOutput = any, TInput = any> {
  address: string;
  abi: AbiItem;
  id?: number;
  input: IInputOutput<TInput>;
  output: IInputOutput<TOutput>;
}
