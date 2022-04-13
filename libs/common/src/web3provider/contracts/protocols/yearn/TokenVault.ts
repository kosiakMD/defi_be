import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '../../../multicall.abi.proxy';

export class TokenVault extends MultiCallAbiProxy {
  static readonly token: AbiItem = {
    name: 'token',
    outputs: [{ type: 'address', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 2831,
  };
}
