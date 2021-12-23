// https://ftmscan.com/address/0x6c7814edb8288f7d75c9588173c4b56acee85720#code
import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '../multicall.abi.proxy';

export class ERC20 extends MultiCallAbiProxy {
  static readonly totalSupply: AbiItem = {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly balanceOf: AbiItem = {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
}
