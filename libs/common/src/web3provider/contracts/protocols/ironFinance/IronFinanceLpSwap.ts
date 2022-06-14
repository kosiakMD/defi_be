import { AbiItem } from 'web3-utils';

import { UniswapV2Pair } from '../../UniswapV2Pair';

//https://polygonscan.com/address/0x837503e8a8753ae17fb8c8151b8e6f586defcb57
export class IronFinanceLpSwap extends UniswapV2Pair {
  static readonly swapStorage: AbiItem = {
    inputs: [],
    name: 'swapStorage',
    outputs: [
      {
        internalType: 'contract LPToken',
        name: 'lpToken',
        type: 'address',
      },
      { internalType: 'uint256', name: 'fee', type: 'uint256' },
      { internalType: 'uint256', name: 'adminFee', type: 'uint256' },
      { internalType: 'uint256', name: 'initialA', type: 'uint256' },
      { internalType: 'uint256', name: 'futureA', type: 'uint256' },
      { internalType: 'uint256', name: 'initialATime', type: 'uint256' },
      { internalType: 'uint256', name: 'futureATime', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'defaultWithdrawFee',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getTokens: AbiItem = {
    inputs: [],
    name: 'getTokens',
    outputs: [{ internalType: 'contract IERC20[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getTokenBalances: AbiItem = {
    inputs: [],
    name: 'getTokenBalances',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getNumberOfTokens: AbiItem = {
    inputs: [],
    name: 'getNumberOfTokens',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
}
