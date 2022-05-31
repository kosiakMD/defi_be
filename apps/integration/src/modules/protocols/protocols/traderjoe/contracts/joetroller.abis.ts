import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class JoetrollerAbis extends MultiCallAbiProxy {
  static readonly getAllMarkets: AbiItem = {
    constant: true,
    inputs: [],
    name: 'getAllMarkets',
    outputs: [
      {
        internalType: 'contract JToken[]',
        name: '',
        type: 'address[]',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
