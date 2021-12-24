// https://ftmscan.com/address/0x6c7814edb8288f7d75c9588173c4b56acee85720#code
import { AbiItem } from 'web3-utils';

import { AbstractStrategy } from './AbstractStrategy';

export class StrategyXSyrup extends AbstractStrategy {
  // reward token
  static readonly output: AbiItem = {
    inputs: [],
    name: 'output',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  // deposited token
  static readonly want: AbiItem = {
    inputs: [],
    name: 'want',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
