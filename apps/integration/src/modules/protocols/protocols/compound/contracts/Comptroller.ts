import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class Comptroller extends MultiCallAbiProxy {
  static readonly compAccrued: AbiItem = {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'compAccrued',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };

  static readonly checkMembership: AbiItem = {
    constant: true,
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'contract CToken', name: 'cToken', type: 'address' },
    ],
    name: 'checkMembership',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
