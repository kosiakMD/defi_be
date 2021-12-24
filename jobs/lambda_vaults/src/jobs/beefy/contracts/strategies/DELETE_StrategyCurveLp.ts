// https://ftmscan.com/address/0x6c7814edb8288f7d75c9588173c4b56acee85720#code
import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class StrategyCurveLp extends MultiCallAbiProxy {
  static readonly balanceOf: AbiItem = {
    inputs: [],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
}
