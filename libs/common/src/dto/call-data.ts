/* eslint-disable max-classes-per-file */
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { ICallData } from '@app/common';

import { InputOutput } from './input-output';

export class CallData<T = any> implements ICallData {
  address: string;
  abi: AbiItem;
  id?: number;
  lpAddress?: string;
  input: InputOutput = plainToClass(InputOutput, {});
  output: InputOutput<T> = plainToClass(InputOutput, {});
}
