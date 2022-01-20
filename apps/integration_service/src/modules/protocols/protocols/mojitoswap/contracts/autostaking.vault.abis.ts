import { AbiItem } from 'web3-utils';
import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class AutostakingVaultAbis extends MultiCallAbiProxy {
  static readonly balanceOf: AbiItem = {
    inputs: [],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function'
  };

  static readonly userInfo: AbiItem = {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'userInfo',
    outputs: [
      {
        internalType: 'uint256',
        name: 'shares',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'lastDepositedTime',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'mojitoAtLastUserAction',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'lastUserActionTime',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function'
  };

  static readonly totalShares: AbiItem = {
    inputs: [],
    name: 'totalShares',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };
}
