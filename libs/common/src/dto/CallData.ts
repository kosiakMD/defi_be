/* eslint-disable max-classes-per-file */
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { InputOutput } from './InputOutput';
import { ICallData } from '../interfaces';

export class CallData<T = any> implements ICallData {
  address: string;
  abi: AbiItem;
  id?: number;
  input: InputOutput = plainToClass(InputOutput, {});
  output: InputOutput<T> = plainToClass(InputOutput, {});
}
