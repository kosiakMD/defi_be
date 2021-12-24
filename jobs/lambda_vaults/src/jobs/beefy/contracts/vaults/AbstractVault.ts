import { CallData } from 'apps/integration_service/src/common/dto';
import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export abstract class AbstractVault extends MultiCallAbiProxy {
  // Dummy function to fix typescript suggestions
  // Executed By Proxy
  totalSupply(): CallData {
    return;
  }
  static readonly totalSupply: AbiItem = {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };

  // Dummy function to fix typescript suggestions
  // Executed By Proxy
  strategy(): CallData {
    return;
  }
  static readonly strategy: AbiItem = {
    inputs: [],
    name: 'strategy',
    outputs: [{ internalType: 'contract IStrategy', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  // Dummy function to fix typescript suggestions
  // Executed By Proxy
  want(): CallData {
    return;
  }
  static readonly want: AbiItem = {
    inputs: [],
    name: 'want',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  // Dummy function to fix typescript suggestions
  // Executed By Proxy
  balance(): CallData {
    return;
  }
  // totalSupply * getPricePerFullShare
  static readonly balance: AbiItem = {
    inputs: [],
    name: 'balance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };

  // Dummy function to fix typescript suggestions
  // Executed By Proxy
  getPricePerFullShare(): CallData {
    return;
  }
  static readonly getPricePerFullShare: AbiItem = {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };

  // Dummy function to fix typescript suggestions
  // Executed By Proxy
  decimals(): CallData {
    return;
  }
  static readonly decimals: AbiItem = {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  };
}
