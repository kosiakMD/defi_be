import { AbiItem } from 'web3-utils';

export class AbisArbi {
  // ABI for CRV pools
  static readonly getCoin: AbiItem = {
    name: 'coins',
    outputs: [
      { type: 'address', name: '' }
    ],
    inputs: [
      { type: 'uint256', name : 'arg0' }
    ],
    constant: true,
    payable: false,
    type: 'function',
    gas: 2310
  };
  static readonly coinBalance: AbiItem = {
    name: 'balances',
    outputs: [
      { type: 'uint256', name: '' }
    ],
    inputs:[
      { type: 'uint256', name: 'arg0' }
    ],
    constant: true,
    payable: false,
    type: 'function',
    gas: 2340
  };
}