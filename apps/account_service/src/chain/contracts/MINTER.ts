import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { MINTER_ABI } from '../abis/MINTER_ABI';

export class MINTER {
  protected contract;

  constructor(address: string, web3Provider: Web3) {
    this.contract = new web3Provider.eth.Contract(MINTER_ABI as AbiItem[], address);
  }

  async coins(index: number): Promise<string> {
    const callResult = await this.contract.methods.coins(index).call();
    return callResult.toLowerCase();
  }
}
