import { AbiItem } from 'web3-utils';

import { AbstractStrategy } from './AbstractStrategy';

export class StrategyCakeV2 extends AbstractStrategy {
  // Reward & Deposit are both 'want' (cake)
  static readonly output: AbiItem = {
    inputs: [],
    name: 'want',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
