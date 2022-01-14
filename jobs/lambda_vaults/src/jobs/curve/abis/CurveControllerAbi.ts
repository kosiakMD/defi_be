import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class CurveControllerAbi extends MultiCallAbiProxy {
  static readonly nGauges: AbiItem = {
    name: 'n_gauges',
    outputs: [{ type: 'int128', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly gauges: AbiItem = {
    name: 'gauges',
    outputs: [{ type: 'address', name: '' }],
    inputs: [{ type: 'uint256', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
  };
}
