import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class PoolAbis extends MultiCallAbiProxy {
  static readonly pendingXVS: AbiItem = {
    constant: true,
    inputs: [
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'pendingXVS',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };

  static readonly userInfo: AbiItem = {
    constant: true,
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'userInfo',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'rewardDebt',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
