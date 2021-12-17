import { AbiItem } from 'web3-utils';

export class Abis {
  static readonly userInfo: AbiItem = {
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'address',
        type: 'address',
        name: '',
      },
    ],
    outputs: [
      {
        internalType: 'uint256',
        type: 'uint256',
        name: 'amount',
      },
      {
        name: 'rewardDebt',
        internalType: 'uint256',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'rewardDebtAtBlock',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'lastWithdrawBlock',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        type: 'uint256',
        name: 'firstDepositBlock',
      },
      {
        name: 'blockdelta',
        internalType: 'uint256',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'lastDepositBlock',
        type: 'uint256',
      },
    ],
    name: 'userInfo',
  };

  static readonly pendingReward: AbiItem = {
    name: 'pendingReward',
    inputs: [
      {
        name: '_pid',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_user',
        internalType: 'address',
        type: 'address',
      },
    ],
    type: 'function',
    outputs: [
      {
        type: 'uint256',
        internalType: 'uint256',
        name: '',
      },
    ],
    stateMutability: 'view',
  };
}
