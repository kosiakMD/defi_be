import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class CurveAbis extends MultiCallAbiProxy {
  static readonly coins: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'coins',
    inputs: [
      {
        name: 'i',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
    gas: 492,
  };

  static readonly balances: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'balances',
    inputs: [
      {
        name: 'i',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    gas: 3933,
  };

  static readonly priceOracle: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'price_oracle',
    inputs: [
      {
        name: 'k',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    gas: 3271,
  };
}
