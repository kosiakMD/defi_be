import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class RewardDistributorAbis extends MultiCallAbiProxy {
  static readonly rewardBorrowSpeeds: AbiItem = {
    constant: true,
    inputs: [
      {
        internalType: 'uint8',
        name: '',
        type: 'uint8',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'rewardBorrowSpeeds',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };

  static readonly rewardSupplySpeeds: AbiItem = {
    constant: true,
    inputs: [
      {
        internalType: 'uint8',
        name: '',
        type: 'uint8',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'rewardSupplySpeeds',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };

  static readonly rewardAccrued: AbiItem = {
    constant: true,
    inputs: [
      {
        internalType: 'uint8',
        name: '',
        type: 'uint8',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'rewardAccrued',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
