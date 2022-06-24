import { AbiItem } from 'web3-utils';

import { UniswapV2Pair } from '../../UniswapV2Pair';

//https://ftmscan.com/address/0xEFe02cB895b6E061FA227de683C04F3Ce19f3A62
export class SpiritSwapGauge extends UniswapV2Pair {
  static readonly earned: AbiItem = {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
}
