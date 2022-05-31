import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '../../../multicall-abi.proxy';

export class VirtualBalanceRewardPool extends MulticallAbiProxy {
  static readonly earned: AbiItem = {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly rewardToken: AbiItem = {
    inputs: [],
    name: 'rewardToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
