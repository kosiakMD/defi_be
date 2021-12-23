import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

// Abi Found: https://github.com/compound-finance/compound-js/blob/master/src/constants.ts
export class CompoundLens extends MultiCallAbiProxy {
  static readonly getCompBalanceMetadataExt: AbiItem = {
    constant: false,
    inputs: [
      { internalType: 'contract Comp', name: 'comp', type: 'address' },
      {
        internalType: 'contract ComptrollerLensInterface',
        name: 'comptroller',
        type: 'address',
      },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'getCompBalanceMetadataExt',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'balance', type: 'uint256' },
          { internalType: 'uint256', name: 'votes', type: 'uint256' },
          { internalType: 'address', name: 'delegate', type: 'address' },
          { internalType: 'uint256', name: 'allocated', type: 'uint256' },
        ],
        internalType: 'struct CompoundLens.CompBalanceMetadataExt',
        name: '',
        type: 'tuple',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  };
}
