import { AbiItem } from 'web3-utils';

import { ChainDto } from '@app/common';
import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

import { BOOSTER_ADDRESS } from '../constants';

export class Booster extends MultiCallAbiProxy {
  constructor(chain: ChainDto) {
    if (!BOOSTER_ADDRESS[chain.id]) throw new Error('Failed to find Convex Booster');

    super(BOOSTER_ADDRESS[chain.id]);
  }

  static readonly poolLength: AbiItem = {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly poolInfo: AbiItem = {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'address', name: 'lptoken', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'gauge', type: 'address' },
      { internalType: 'address', name: 'crvRewards', type: 'address' },
      { internalType: 'address', name: 'stash', type: 'address' },
      { internalType: 'bool', name: 'shutdown', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  };
}
