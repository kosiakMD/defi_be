import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class LensAbis extends MultiCallAbiProxy {
  static readonly getInterestRateModel: AbiItem = {
    inputs: [
      {
        internalType: 'contract PTokenLensInterface',
        name: 'pToken',
        type: 'address',
      },
    ],
    name: 'getInterestRateModel',
    outputs: [
      {
        components: [
          {
            internalType: 'contract PTokenLensInterface',
            name: 'market',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'blocksPerYear',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'multiplierPerBlock',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'baseRatePerBlock',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'jumpMultiplierPerBlock',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'kink',
            type: 'uint256',
          },
        ],
        internalType: 'struct WePiggyLensV2.InterestRateModel',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };
}
