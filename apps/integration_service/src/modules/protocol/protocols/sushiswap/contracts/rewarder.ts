import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '@app/common/web3provider/multicall-abi.proxy';

export class SushiSwapRewarder extends MulticallAbiProxy {
  static readonly pendingToken: AbiItem = {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingToken',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly pendingTokens: AbiItem = {
    inputs: [
      { internalType: 'uint256', name: 'pid', type: 'uint256' },
      { internalType: 'address', name: 'user', type: 'address' },
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
