import { AbiItem } from 'web3-utils';
import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class AutostakingVaultAbis extends MultiCallAbiProxy {
  static readonly balanceOf: AbiItem = {
    inputs: [],
    name: 'balanceOf',
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
