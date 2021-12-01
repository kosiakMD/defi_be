import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class ERC20Abi extends MultiCallAbiProxy {
  static readonly totalSupply: AbiItem = {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  };
}
