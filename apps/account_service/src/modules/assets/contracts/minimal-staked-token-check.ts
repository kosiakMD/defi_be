import { AbiItem } from 'web3-utils';

import { MulticallAbiProxy } from '@app/common/web3provider/multicall-abi.proxy';

/**
 * Mixup of many different partial ABI's
 * This is used to check if a token is a staking token/has underlying tokens.
 * All calls get called automatically when saving a token,
 * so no parameters/inputs can be used here
 */
export class MinimalStakedTokenCheck extends MulticallAbiProxy {
  // https://etherscan.io/address/0x0ab87046f-bb341D058F17CBC4c1133F25a20a52f#code
  static readonly sOHM: AbiItem = {
    inputs: [],
    name: 'sOHM',
    outputs: [{ internalType: 'contract IsOHM', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly MEMO: AbiItem = {
    inputs: [],
    name: 'MEMO',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };

  // https://etherscan.io/address/0x8798249c2e607446efb7ad49ec89dd1865ff4272#code
  static readonly sushi: AbiItem = {
    inputs: [],
    name: 'sushi',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
