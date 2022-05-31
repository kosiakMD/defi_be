import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class ViperAbis extends MultiCallAbiProxy {
  static readonly lockOf: AbiItem = {
    type: 'function',
    stateMutability: 'view',
    name: 'lockOf',
    inputs: [
      {
        name: '_holder',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    constant: true,
  };

  static readonly balanceOf: AbiItem = {
    name: 'balanceOf',
    stateMutability: 'view',
    type: 'function',
    outputs: [
      {
        name: '',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    constant: true,
  };
}
