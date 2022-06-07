import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '../../../multicall.abi.proxy';

export class CurveCryptoFactory extends MultiCallAbiProxy {
  static readonly getBalances: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[2]' }],
  };
}
