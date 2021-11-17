import { AbiItem } from 'web3-utils';

export class Abis {
  static readonly getReserves: AbiItem = {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: '_reserve0', type: 'uint112' },
      { internalType: 'uint112', name: '_reserve1', type: 'uint112' },
      { internalType: 'uint32', name: '_blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly balanceOf: AbiItem = {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
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
  static readonly totalAllocPoint: AbiItem = {
    inputs: [],
    name: 'totalAllocPoint',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly poolLength: AbiItem = {
    inputs: [],
    name: 'poolLength',
    outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly balance: AbiItem = {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'uint256',
        name: '',
        internalType: 'uint256',
      },
    ],
    name: 'balance',
    inputs: [],
  };
  static readonly rewardToken: AbiItem = {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'address',
        name: '',
        internalType: 'contract IERC20',
      },
    ],
    name: 'rewardToken',
    inputs: [],
  };
  static readonly pendingTokens: AbiItem = {
    inputs: [
      {
        internalType: 'uint256',
        name: '_pid',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'pendingTokens',
    outputs: [
      {
        internalType: 'uint256',
        name: 'pendingJoe',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'bonusTokenAddress',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'bonusTokenSymbol',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'pendingBonusToken',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly userInfo: AbiItem = {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
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
    stateMutability: 'view',
    type: 'function',
  };
}
