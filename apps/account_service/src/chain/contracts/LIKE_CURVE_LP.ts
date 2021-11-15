import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { LIKE_CURVE_LP_ABI } from '../abis/LIKE_CURVE_LP_ABI';
import { ERC20 } from './ERC20';

export class LIKE_CURVE_LP extends ERC20 {
  constructor(address: string, web3Provider: Web3) {
    super(address, web3Provider);
    this.contract = new web3Provider.eth.Contract(LIKE_CURVE_LP_ABI as AbiItem[], address);
  }

  async minter(): Promise<string> {
    const callResult = await this.contract.methods.minter().call();
    return callResult.toLowerCase();
  }
}
