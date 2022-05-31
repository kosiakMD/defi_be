import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '../../../multicall-abi.proxy';

// https://etherscan.io/address/0x90E00ACe148ca3b23Ac1b-c8C240C2a7Dd9c2d7f5
export class CurveFactory extends MulticallAbiProxy {
  static readonly isMeta: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'is_meta',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    gas: 3152,
  };
  static readonly getPoolAssetType: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_asset_type',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 5450,
  };

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
    outputs: [{ name: '', type: 'address[4]' }],
    gas: 9164,
  };

  static readonly getUnderlyingCoins: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
    gas: 21345,
  };

  static readonly getBalances: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[4]' }],
    gas: 20435,
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
}
