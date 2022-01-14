import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class ExchangeRates extends MultiCallAbiProxy {
  static readonly target: AbiItem = {
    constant: true,
    inputs: [],
    name: 'target',
    outputs: [{ name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };

  static readonly rateForCurrency: AbiItem = {
    constant: true,
    inputs: [{ internalType: 'bytes32', name: 'currencyKey', type: 'bytes32' }],
    name: 'rateForCurrency',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
