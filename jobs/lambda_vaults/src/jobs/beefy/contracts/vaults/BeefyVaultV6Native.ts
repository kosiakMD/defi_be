import { AbiItem } from 'web3-utils';

import { AbstractVault } from './AbstractVault';

export class BeefyVaultV6Native extends AbstractVault {
  static readonly want: AbiItem = {
    inputs: [],
    name: 'native',
    outputs: [{ internalType: 'contract IWrappedNative', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
