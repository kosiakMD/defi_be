import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class CurveRegistryAbi extends MultiCallAbiProxy {
  static readonly poolList: AbiItem = {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'pool_list',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getPoolName: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_name',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'string' }],
  };

  static readonly poolCount: AbiItem = {
    inputs: [],
    name: 'pool_count',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getLpToken: AbiItem = {
    inputs: [{ name: 'pool', type: 'address' }],
    name: 'get_lp_token',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getPoolFromLpToken: AbiItem = {
    inputs: [{ name: 'arg0', type: 'address' }],
    name: 'get_pool_from_lp_token',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getBalances: AbiItem = {
    inputs: [{ name: '_pool', type: 'address' }],
    name: 'get_balances',
    outputs: [{ name: '', type: 'uint256[8]' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getMetaPoolBalances: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[4]' }],
  };

  static readonly getUnderlyingBalances: AbiItem = {
    inputs: [{ name: '_pool', type: 'address' }],
    name: 'get_underlying_balances',
    outputs: [{ name: '', type: 'uint256[8]' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getVirtualPriceFromLpToken: AbiItem = {
    inputs: [{ name: '_token', type: 'address' }],
    name: 'get_virtual_price_from_lp_token',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getGauge: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_gauge',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  };

  static readonly getGauges: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_gauges',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [
      { name: '', type: 'address[10]' },
      { name: '', type: 'int128[10]' },
    ],
  };
}
