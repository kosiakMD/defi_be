import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '../../../multicall.abi.proxy';

export class BentoBox extends MultiCallAbiProxy {
  static readonly balanceOf: AbiItem = {
    inputs: [
      { internalType: 'contract IERC20', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
}
