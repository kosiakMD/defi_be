import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '@app/common/web3provider/multicall-abi.proxy';

export class OracleAbis extends MulticallAbiProxy {
  static readonly getUnderlyingPrice: AbiItem = {
    constant: true,
    inputs: [
      {
        internalType: 'contract JToken',
        name: 'jToken',
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
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
