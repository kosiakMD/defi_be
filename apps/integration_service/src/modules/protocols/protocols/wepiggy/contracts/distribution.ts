import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class DistributionAbis extends MultiCallAbiProxy {
  static readonly wpcSpeeds: AbiItem = {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'wpcSpeeds',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly pendingWPCAccrued: AbiItem = {
    inputs: [
      {
        internalType: 'address',
        name: 'holder',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'borrowers',
        type: 'bool',
      },
      {
        internalType: 'bool',
        name: 'suppliers',
        type: 'bool',
      },
    ],
    name: 'pendingWpcAccrued',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };
}
