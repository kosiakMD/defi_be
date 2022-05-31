import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '../../../multicall-abi.proxy';

export class CryptoSwapRegistry extends MulticallAbiProxy {
  static readonly getNCoins: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_n_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 2834,
  };

  static readonly getCoins: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
    gas: 22975,
  };

  static readonly getVirtualPriceFromLpToken: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_virtual_price_from_lp_token',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 5321,
  };

  static readonly getBalances: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
    gas: 41626,
  };

  static readonly getPoolFromLpToken: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3548,
  };
}
