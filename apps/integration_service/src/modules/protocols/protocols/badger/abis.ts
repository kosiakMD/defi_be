import { AbiItem } from 'web3-utils';

export class Abis {
  // call for vault
  static readonly balanceOf: AbiItem = {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  };
  // calls for crv pools
  static readonly baseRewardsPool: AbiItem = {
    inputs: [],
    name: 'baseRewardsPool',
    outputs: [
      {
        internalType: 'contract IBaseRewardsPool',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  };
  static readonly earned: AbiItem = {
    inputs:[
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'earned',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  };
}