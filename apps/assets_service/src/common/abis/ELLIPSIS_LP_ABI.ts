import { AbiItem } from 'web3-utils';

export class EllipsisLpAbi {
  static readonly minter: AbiItem = {
    inputs: [],
    name: 'minter',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
