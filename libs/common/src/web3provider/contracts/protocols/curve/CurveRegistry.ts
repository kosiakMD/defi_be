import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '../../../multicall.abi.proxy';

// https://etherscan.io/address/0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5
export class CurveRegistry extends MultiCallAbiProxy {
  static readonly getNCoins: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_n_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 2834,
  };

  static readonly poolCount: AbiItem = {
    inputs: [],
    name: 'pool_count',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
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
  };

  static readonly getPoolName: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_name',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'string' }],
  };

  static readonly getPoolFromLpToken: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  };

  static readonly poolList: AbiItem = {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'pool_list',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getToken: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_token',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
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
