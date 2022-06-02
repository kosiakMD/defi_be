import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class ComptrollerAbis extends MultiCallAbiProxy {
  static readonly getAllMarkets: AbiItem = {
    inputs: [],
    name: 'getAllMarkets',
    outputs: [
      {
        internalType: 'contract PToken[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getOracle: AbiItem = {
    inputs: [],
    name: 'oracle',
    outputs: [
      {
        internalType: 'contract IPriceOracle',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };
}
