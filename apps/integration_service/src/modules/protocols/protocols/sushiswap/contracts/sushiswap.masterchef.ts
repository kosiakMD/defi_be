import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '@app/common/web3provider/multicall-abi.proxy';

export class SushiSwapMasterChefAbi extends MulticallAbiProxy {
  static readonly pendingSushi: AbiItem = {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingSushi',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly rewarder: AbiItem = {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewarder',
    outputs: [{ internalType: 'contract IRewarder', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
