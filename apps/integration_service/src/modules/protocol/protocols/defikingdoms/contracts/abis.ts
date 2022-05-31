import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '@app/common/web3provider/multicall-abi.proxy';

export class Abis extends MulticallAbiProxy {
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

  static readonly balanceOf: AbiItem = {
    stateMutability: 'view',
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    type: 'function',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    constant: true,
  };

  static readonly lockOf: AbiItem = {
    type: 'function',
    outputs: [
      {
        type: 'uint256',
        internalType: 'uint256',
        name: '',
      },
    ],
    stateMutability: 'view',
    inputs: [
      {
        type: 'address',
        internalType: 'address',
        name: '_holder',
      },
    ],
    name: 'lockOf',
    constant: true,
  };

  static readonly getLockPercent: AbiItem = {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        internalType: 'uint256',
        type: 'uint256',
        name: '',
      },
    ],
    type: 'function',
    stateMutability: 'view',
    name: 'PERCENT_LOCK_BONUS_REWARD',
    constant: true,
  };

  static readonly totalSupply: AbiItem = {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
