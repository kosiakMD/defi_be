import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class CauldronContract extends MultiCallAbiProxy {
  static readonly collaterizationRate: AbiItem = {
    inputs: [],
    name: 'COLLATERIZATION_RATE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly accrueInfo: AbiItem = {
    inputs: [],
    name: 'accrueInfo',
    outputs: [
      { internalType: 'uint64', name: 'lastAccrued', type: 'uint64' },
      { internalType: 'uint128', name: 'feesEarned', type: 'uint128' },
      { internalType: 'uint64', name: 'INTEREST_PER_SECOND', type: 'uint64' },
    ],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly collateral: AbiItem = {
    inputs: [],
    name: 'collateral',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly magicInternetMoney: AbiItem = {
    inputs: [],
    name: 'magicInternetMoney',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly bentoBox: AbiItem = {
    inputs: [],
    name: 'bentoBox',
    outputs: [{ internalType: 'contract IBentoBoxV1', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly userCollateralShare: AbiItem = {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userCollateralShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly userBorrowPart: AbiItem = {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userBorrowPart',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
}
