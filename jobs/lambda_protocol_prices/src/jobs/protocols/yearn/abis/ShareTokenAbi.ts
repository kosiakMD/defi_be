import { AbiItem } from 'web3-utils';

import { BaseMultiCallProxy } from '../../../utils/BaseMulticallProxy';

export class ShareTokenAbi extends BaseMultiCallProxy {
  static readonly pricePerShare: AbiItem = {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly token: AbiItem = {
    name: 'token',
    outputs: [{ type: 'address', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 2921,
  };

  static readonly decimals: AbiItem = {
    name: 'decimals',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 2801,
  };
}
