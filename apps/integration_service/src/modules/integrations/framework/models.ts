import { AbiItem } from 'web3-utils';
import { CallData } from '@app/common/dto/CallData';

export class ChainCall {
  address: string;
  abi: AbiItem;
  inputData: any[];
}

export class Instructions {
  chainCalls: ChainCall[];
  fieldsMapping: object;
  context?: object;
}

export class OrderedCalls {
  keys: string[];
  calls: Map<string, CallData>;
}
