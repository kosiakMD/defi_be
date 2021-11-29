import { AbiItem } from 'web3-utils';

export class MulticallAbi {
  static readonly aggregate: AbiItem = {
    constant: true,
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate',
    outputs: [
      { name: 'blockNumber', type: 'uint256' },
      { name: 'returnData', type: 'bytes[]' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
