import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class StrategyMasterChefLP extends MultiCallAbiProxy {
  // not available on single staked (should just get this from assets breakdown though!)
  static readonly lpToken0: AbiItem = {
    inputs: [],
    name: 'lpToken0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  // not available on single staked (should just get this from assets breakdown though!)
  static readonly lpToken1: AbiItem = {
    inputs: [],
    name: 'lpToken1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  // reward token
  static readonly output: AbiItem = {
    inputs: [],
    name: 'output',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  // deposited token
  static readonly want: AbiItem = {
    inputs: [],
    name: 'want',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
