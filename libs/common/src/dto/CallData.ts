/* eslint-disable max-classes-per-file */
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { ICallData } from '@app/common';

import { InputOutput } from './InputOutput';

export class CallData implements ICallData {
  address: string;
  abi: AbiItem;
  id?: number;
  input: InputOutput = plainToClass(InputOutput, {});
  output: InputOutput = plainToClass(InputOutput, {});
}
