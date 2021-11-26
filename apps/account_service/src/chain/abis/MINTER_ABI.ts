import { AbiItem } from 'web3-utils';

export class MinterAbi {
  static readonly coins: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'coins',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  };
}
