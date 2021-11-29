/* eslint-disable max-classes-per-file */
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { ICallData, IInputOutput } from '@app/common';

export class InputOutput implements IInputOutput {
  data?: any = null;
  plain?: string = null;
}

export class CallData implements ICallData {
  address: string;
  abi: AbiItem;
  id?: number;
  input: InputOutput = plainToClass(InputOutput, {});
  output: InputOutput = plainToClass(InputOutput, {});
}
