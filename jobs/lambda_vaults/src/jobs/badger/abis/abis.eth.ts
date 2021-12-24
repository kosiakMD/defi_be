import { AbiItem } from 'web3-utils';

export class AbisEth {
  // ABI for CRV pools
  static readonly getCoinV1: AbiItem = {
    name: 'coins',
    outputs: [
      { type: 'address', name: '' }
    ],
    inputs: [
      { type: 'int128', name : 'arg0' }
    ],
    constant: true,
    payable: false,
    type: 'function',
    gas: 2310
  };
  static readonly getCoinV2: AbiItem = {
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
  static readonly coinBalanceV1: AbiItem = {
    name: 'balances',
    outputs: [
      { type: 'uint256', name: '' }
    ],
    inputs:[
      { type: 'int128', name: 'arg0' }
    ],
    constant: true,
    payable: false,
    type: 'function',
    gas: 2340
  };
  static readonly coinBalanceV2: AbiItem = {
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
  // ABI for sushiswap and uniswap pools
  static readonly getToken0: AbiItem = {
    inputs: [],
    name: 'token0',
    outputs: [
      { internalType: 'address', name: '', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function'
  };
  static readonly getToken1: AbiItem = {
    inputs: [],
    name: 'token1',
    outputs: [
      { internalType: 'address', name: '', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function'
  };
}