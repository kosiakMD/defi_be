import { AbiItem } from 'web3-utils';

import { CallData } from '@app/common/dto/CallData';

import { AbstractStrategy } from './AbstractStrategy';

export abstract class AbstractMasterChefStrategy extends AbstractStrategy {
  // Dummy function to fix typescript suggestions
  // Executed By Proxy
  lpToken0(): CallData {
    return;
  }
  // Dummy function to fix typescript suggestions
  // Executed By Proxy
  lpToken1(): CallData {
    return;
  }
  static readonly lpToken0: AbiItem = {
    inputs: [],
    name: 'lpToken0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  // not available on single staked (should just get this from assets breakdown though!)
  static readonly lpToken1: AbiItem = {
    inputs: [],
    name: 'lpToken1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
