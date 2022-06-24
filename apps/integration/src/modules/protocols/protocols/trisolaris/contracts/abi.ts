import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class TrisolarisAbi extends MultiCallAbiProxy {
  static userInfo: AbiItem = {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  };
  static pendingTri: AbiItem = {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingTri',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
  static rewarder: AbiItem = {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewarder',
    outputs: [{ internalType: 'contract IRewarder', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  static pendingTokens: AbiItem = {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'pendingTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'rewardTokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'rewardAmounts', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  };
}
