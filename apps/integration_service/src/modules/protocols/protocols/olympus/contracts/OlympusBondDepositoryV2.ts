import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class OlympusBondDepositoryV2 extends MultiCallAbiProxy {
  static readonly indexesFor: AbiItem = {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'indexesFor',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly notes: AbiItem = {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'notes',
    outputs: [
      { internalType: 'uint256', name: 'payout', type: 'uint256' },
      { internalType: 'uint48', name: 'created', type: 'uint48' },
      { internalType: 'uint48', name: 'matured', type: 'uint48' },
      { internalType: 'uint48', name: 'redeemed', type: 'uint48' },
      { internalType: 'uint48', name: 'marketID', type: 'uint48' },
    ],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly markets: AbiItem = {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'markets',
    outputs: [
      { internalType: 'uint256', name: 'capacity', type: 'uint256' },
      { internalType: 'contract IERC20', name: 'quoteToken', type: 'address' },
      { internalType: 'bool', name: 'capacityInQuote', type: 'bool' },
      { internalType: 'uint64', name: 'totalDebt', type: 'uint64' },
      { internalType: 'uint64', name: 'maxPayout', type: 'uint64' },
      { internalType: 'uint64', name: 'sold', type: 'uint64' },
      { internalType: 'uint256', name: 'purchased', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  };
}
