import { AbiItem } from 'web3-utils';

import { ERC20 } from '@app/common/web3provider/contracts/ERC20';

export class TokemakToken extends ERC20 {
  static readonly underlyer: AbiItem = {
    inputs: [],
    name: 'underlyer',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
}
