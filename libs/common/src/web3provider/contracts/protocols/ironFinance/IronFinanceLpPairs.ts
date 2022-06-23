import { AbiItem } from 'web3-utils';

import { UniswapV2Pair } from '../../UniswapV2Pair';

//https://polygonscan.com/address/0xb4d09ff3da7f9e9a2ba029cb0a81a989fd7b8f17
export class IronFinanceLpPairs extends UniswapV2Pair {
  static readonly swap: AbiItem = {
    inputs: [],
    name: 'swap',
    outputs: [{ internalType: 'contract IIronSwap', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
