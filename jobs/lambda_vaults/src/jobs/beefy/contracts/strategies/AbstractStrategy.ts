import { AbiItem } from 'web3-utils';

import { CallData } from '@app/common/dto/CallData';
import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export abstract class AbstractStrategy extends MultiCallAbiProxy {
  // Dummy function to fix typescript suggestions
  // Executed By Proxy
  // TODO: Find a proper way to set instance types on class based on static fields...
  want(): CallData {
    return;
  }
  // Dummy function to fix typescript suggestions
  // Executed By Proxy
  output(): CallData {
    return;
  }

  // Deposited Token
  static readonly want: AbiItem = {
    inputs: [],
    name: 'want',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  // Reward Token
  static readonly output: AbiItem = {
    inputs: [],
    name: 'output',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
