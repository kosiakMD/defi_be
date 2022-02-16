import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '../../../multicall.abi.proxy';

/**
 * This is called the Aave Generic Token, since its aim is to be the common
 * ground betweem variable & stable iterest bearing tokens. If you need
 * something to be Variable or Stable specific,
 * extend from this, and use that instead
 */
export class AaveGenericToken extends MultiCallAbiProxy {
  static readonly UNDERLYING_ASSET_ADDRESS: AbiItem = {
    inputs: [],
    name: 'UNDERLYING_ASSET_ADDRESS',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
