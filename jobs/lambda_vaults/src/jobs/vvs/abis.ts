import { AbiItem } from 'web3-utils';

import { MulticallAbi } from '@app/common/web3provider/multicall.abi';

export class Abis extends MulticallAbi {
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

  static readonly balanceOf: AbiItem = {
    constant: true,
    inputs: [{ type: 'address', name: 'account', internalType: 'address' }],
    name: 'balanceOf',
    outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
  static readonly poolInfo: AbiItem = {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IBEP20', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accCakePerShare', type: 'uint256' },
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

  static readonly vvsPerBlock: AbiItem = {
    type: 'function',
    stateMutability: 'view',
    outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    name: 'vvsPerBlock',
    inputs: [],
  };

  static readonly poolLength: AbiItem = {
    outputs: [
      {
        type: 'uint256',
        name: '',
        internalType: 'uint256',
      },
    ],
    name: 'poolLength',
    inputs: [],
    stateMutability: 'view',
    type: 'function',
  };
}
