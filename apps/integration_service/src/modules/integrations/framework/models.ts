import { AbiItem } from 'web3-utils';

import { CallData } from '@app/common/dto/CallData';

export class ChainCall {
  address: string;
  abi: AbiItem;
  inputData: any[];
}

export class Instructions {
  chainCalls?: ChainCall[];
  calls?: any[]; //todo keep this field and remove chainCalls
  fieldsMapping: object;
  context?: any;
}

export class FeatureInstructions {
  instructions: Instructions[];
  processor: string;
}

export class OrderedCalls {
  keys: string[];
  calls: Map<string, CallData>;
}
