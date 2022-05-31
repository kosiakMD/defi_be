import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '../../../multicall-abi.proxy';

// https://etherscan.io/address/0x90E00ACe148ca3b23Ac1b-c8C240C2a7Dd9c2d7f5
export class CurveRegistry extends MulticallAbiProxy {
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

  static readonly getUnderlyingCoins: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
    gas: 12194,
  };

  static readonly getBalances: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
    gas: 41626,
  };

  static readonly getUnderlyingBalances: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
    gas: 162842,
  };

  static readonly getPoolFromLpToken: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3548,
  };
  static readonly getVirtualPriceFromLpToken: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_virtual_price_from_lp_token',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 1927,
  };
}
