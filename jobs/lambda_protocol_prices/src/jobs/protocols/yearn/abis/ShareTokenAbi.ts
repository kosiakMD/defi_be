import { AbiItem } from 'web3-utils';

import { BaseMultiCallProxy } from '../../../utils/BaseMulticallProxy';

export class ShareTokenAbi extends BaseMultiCallProxy {
  static readonly pricePerShare: AbiItem = {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view',
    type: 'function',
  };
}
