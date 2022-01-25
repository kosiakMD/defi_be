import { AbiItem } from 'web3-utils';

export class MasterchefAbis {
  static readonly userInfo: AbiItem = {
    constant: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        indexed: false,
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

  static readonly pendingIsland: AbiItem = {
    constant: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: '_pid',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'pendingIsland',
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
}
