import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class TokemakRewardHash extends MultiCallAbiProxy {
  static readonly latestCycleIndex: AbiItem = {
    inputs: [],
    name: 'latestCycleIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly cycleHashes: AbiItem = {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'cycleHashes',
    outputs: [
      { internalType: 'string', name: 'latestClaimable', type: 'string' },
      { internalType: 'string', name: 'cycle', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  };
}
