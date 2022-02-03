import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class OracleAbis extends MultiCallAbiProxy {
  static readonly getUnderlyingPrice: AbiItem = {
    inputs: [
      {
        internalType: 'address',
        name: '_pToken',
        type: 'address',
      },
    ],
    name: 'getUnderlyingPrice',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };
}
