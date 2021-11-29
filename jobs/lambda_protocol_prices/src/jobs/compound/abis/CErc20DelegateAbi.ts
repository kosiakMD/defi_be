import { AbiItem } from 'web3-utils';

import { BaseMultiCallProxy } from '../../utils/BaseMulticallProxy';

export class CErc20DelegateAbi extends BaseMultiCallProxy {
  static readonly exchangeRateStored: AbiItem = {
    constant: true,
    inputs: [],
    name: 'exchangeRateStored',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
  static readonly underlying: AbiItem = {
    constant: true,
    inputs: [],
    name: 'underlying',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
