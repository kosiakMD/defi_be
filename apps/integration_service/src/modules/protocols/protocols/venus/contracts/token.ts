import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '@app/common/web3provider/multicall-abi.proxy';

export class TokenAbis extends MulticallAbiProxy {
  static readonly balanceOf: AbiItem = {
    constant: true,
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'balanceOf',
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
