import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '@app/common/web3provider/multicall-abi.proxy';

export class Comptroller extends MulticallAbiProxy {
  static readonly compAccrued: AbiItem = {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'compAccrued',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
