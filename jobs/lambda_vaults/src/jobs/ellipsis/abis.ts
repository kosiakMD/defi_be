import { AbiItem } from 'web3-utils';

export class Abis {
  static readonly getReserves: AbiItem = {
    constant: true,
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: '_reserve0', type: 'uint112' },
      { internalType: 'uint112', name: '_reserve1', type: 'uint112' },
      { internalType: 'uint32', name: '_blockTimestampLast', type: 'uint32' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
  static readonly rewardsPerSecond: AbiItem = {
    inputs: [],
    name: 'rewardsPerSecond',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly balances: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'balances',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    // gas: 2007,
  };
  static readonly coins: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'coins',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    // gas: 1977,
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
  static readonly poolInfo: AbiItem = {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'oracleIndex', type: 'uint256' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardTime', type: 'uint256' },
      { internalType: 'uint256', name: 'accRewardPerShare', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly minter = {
    inputs: [],
    name: 'minter',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
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
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
}
