import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class WMemoContract extends MultiCallAbiProxy {
  static readonly wMEMOToMEMO: AbiItem = {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'wMEMOToMEMO',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly balanceOf: AbiItem = {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
}
