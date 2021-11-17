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
  static readonly poolInfoV2: AbiItem = {
    inputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { type: 'address', name: 'lpToken', internalType: 'contract IERC20' },
      { type: 'uint256', name: 'allocPoint', internalType: 'uint256' },
      { type: 'uint256', name: 'lastRewardTimestamp', internalType: 'uint256' },
      { type: 'uint256', name: 'accJoePerShare', internalType: 'uint256' },
      { type: 'address', name: 'rewarder', internalType: 'contract IRewarder' },
    ],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly poolInfoV3: AbiItem = {
    inputs: [
      {
        type: 'uint256',
        name: '',
        internalType: 'uint256',
      },
    ],
    name: 'poolInfo',
    outputs: [
      { type: 'address', name: 'lpToken', internalType: 'contract IERC20' },
      { type: 'uint256', name: 'accJoePerShare', internalType: 'uint256' },
      { type: 'uint256', name: 'lastRewardTimestamp', internalType: 'uint256' },
      { type: 'uint256', name: 'allocPoint', internalType: 'uint256' },
      { type: 'address', name: 'rewarder', internalType: 'contract IRewarder' },
    ],
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
  static readonly joePerSecV2: AbiItem = {
    inputs: [],
    name: 'joePerSec',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly joePerSecV3: AbiItem = {
    inputs: [],
    name: 'joePerSec',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
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
  static readonly tokenPerSec: AbiItem = {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'uint256',
        name: '',
        internalType: 'uint256',
      },
    ],
    name: 'tokenPerSec',
    inputs: [],
  };
}
