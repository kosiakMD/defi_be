import { AbiItem } from 'web3-utils';

export const CERC20_ABI: AbiItem[] = [
  {
    inputs: [],
    name: 'underlying',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];
