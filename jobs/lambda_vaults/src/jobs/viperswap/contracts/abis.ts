import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class Abis extends MultiCallAbiProxy {
  static readonly poolLength: AbiItem = {
    name: 'poolLength',
    stateMutability: 'view',
    outputs: [
      {
        name: '',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    type: 'function',
    inputs: [],
  };

  static readonly poolInfo: AbiItem = {
    name: 'poolInfo',
    stateMutability: 'view',
    type: 'function',
    inputs: [
      {
        name: '',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'lpToken',
        type: 'address',
        internalType: 'contract IERC20',
      },
      {
        type: 'uint256',
        name: 'allocPoint',
        internalType: 'uint256',
      },
      {
        internalType: 'uint256',
        type: 'uint256',
        name: 'lastRewardBlock',
      },
      {
        name: 'accGovTokenPerShare',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  };

  static readonly totalAllocPoint: AbiItem = {
    stateMutability: 'view',
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    inputs: [],
    name: 'totalAllocPoint',
    type: 'function',
  };

  static readonly rewardPerBlock: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'REWARD_PER_BLOCK',
    inputs: [],
    outputs: [
      {
        internalType: 'uint256',
        type: 'uint256',
        name: '',
      },
    ],
  };

  static readonly rewardMultiplier: AbiItem = {
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'REWARD_MULTIPLIER',
    constant: true,
  };

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
}
