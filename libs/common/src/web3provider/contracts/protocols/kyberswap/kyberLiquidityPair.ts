import { AbiItem } from 'web3-utils';

import { UniswapV2Pair } from '../../UniswapV2Pair';

//https://etherscan.io/address/0x93d1d464df6953fe6c698b7ac6c9a58b5c3f2b16
export class KyberLiquidityPair extends UniswapV2Pair {
  static readonly getReserves: AbiItem = {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: '_reserve0', type: 'uint112' },
      { internalType: 'uint112', name: '_reserve1', type: 'uint112' },
    ],
    stateMutability: 'view',
    type: 'function',
  };
}
