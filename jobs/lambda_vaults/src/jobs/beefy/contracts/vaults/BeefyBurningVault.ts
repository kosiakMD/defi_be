import { AbiItem } from 'web3-utils';

import { AbstractVault } from './AbstractVault';

export class BeefyBurningVault extends AbstractVault {
  static readonly want: AbiItem = {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
