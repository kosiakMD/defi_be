import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class Issuer extends MultiCallAbiProxy {
  static readonly availableSynthCount: AbiItem = {
    constant: true,
    inputs: [],
    name: 'availableSynthCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };

  static readonly availableSynths: AbiItem = {
    constant: true,
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'availableSynths',
    outputs: [{ internalType: 'contract ISynth', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getSynths: AbiItem = {
    constant: true,
    inputs: [{ internalType: 'bytes32[]', name: 'currencyKeys', type: 'bytes32[]' }],
    name: 'getSynths',
    outputs: [{ internalType: 'contract ISynth[]', name: '', type: 'address[]' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };

  static readonly synths: AbiItem = {
    constant: true,
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'synths',
    outputs: [{ internalType: 'contract ISynth', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };

  static readonly synthsByAddress: AbiItem = {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'synthsByAddress',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
