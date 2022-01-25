import { AbiItem } from 'web3-utils';
import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class SinglePoolAbis extends MultiCallAbiProxy {
  static readonly bonusMultiplier: AbiItem = {
    constant: false,
    inputs: [],
    name: 'BONUS_MULTIPLIER',
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

  static readonly rewardPerBlock: AbiItem = {
    constant: false,
    inputs: [],
    name: 'rewardPerBlock',
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

  static readonly stakedToken: AbiItem = {
    constant: false,
    inputs: [],
    name: 'stakedToken',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: '',
        type: 'address',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };

  static readonly totalDeposit: AbiItem = {
    constant: false,
    inputs: [],
    name: 'totalDeposit',
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
