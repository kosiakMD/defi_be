import { AbiItem } from 'web3-utils';

import { AbstractMasterChefStrategy } from './AbstractMasterChefStrategy';

export class StrategyCakeLP extends AbstractMasterChefStrategy {
  // reward token
  static readonly output: AbiItem = {
    inputs: [],
    name: 'cake',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
