import { AbiItem } from 'web3-utils';

import { BaseMultiCallProxy } from '../../../utils/BaseMulticallProxy';

export class ShareTokenAbi extends BaseMultiCallProxy {
  static readonly decimals: AbiItem = {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
  static readonly getPricePerFullShare: AbiItem = {
    constant: true,
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
  static readonly token: AbiItem = {
    constant: true,
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
