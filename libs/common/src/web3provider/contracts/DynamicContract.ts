import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';
import { Address } from '../../types';
import { CallData } from '../../dto/CallData';

export class DynamicContract {
  constructor(public address: Address) {}

  createCall(abi: AbiItem, ...inputs: any[]): CallData {
    return plainToClass(CallData, {
      address: this.address,
      abi: abi,
      input: { data: inputs },
    } as CallData);
  }
}
