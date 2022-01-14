import { AbiItem } from 'web3-utils';

import { AbstractMasterChefStrategy } from './AbstractMasterChefStrategy';

export class StrategySpaceLp extends AbstractMasterChefStrategy {
  // deposited token
  static readonly want: AbiItem = {
    inputs: [],
    name: 'lpPair',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
