import { AbiItem } from 'web3-utils';

export class PancakeAbis {
  static readonly mcv2 = {
    address: '0x73feaa1ee314f8c655e354234017be2193c9e24e',
    pendingCake: {
      inputs: [
        { internalType: 'uint256', name: '_pid', type: 'uint256' },
        { internalType: 'address', name: '_user', type: 'address' },
      ],
      name: 'pendingCake',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    } as AbiItem,
  };
}
