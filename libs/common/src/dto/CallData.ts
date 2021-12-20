/* eslint-disable max-classes-per-file */
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { ICallData } from '@app/common';

import { InputOutput } from './InputOutput';

export class CallData<TOutput = any, TInput = any> implements ICallData {
  address: string;
  abi: AbiItem;
  id?: number;
  input: InputOutput<TInput> = plainToClass(InputOutput, {} as InputOutput<TInput>);
  output: InputOutput<TOutput> = plainToClass(InputOutput, {} as InputOutput<TOutput>);
}
