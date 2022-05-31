import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '../../../multicall-abi.proxy';

export class TokenVault extends MulticallAbiProxy {
  static readonly token: AbiItem = {
    name: 'token',
    outputs: [{ type: 'address', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 2831,
  };
}
