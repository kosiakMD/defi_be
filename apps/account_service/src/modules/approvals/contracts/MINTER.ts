import Web3 from 'web3';

import { MinterAbi } from '../abis/MINTER_ABI';

export class MINTER {
  protected contract;

  constructor(address: string, web3Provider: Web3) {
    this.contract = new web3Provider.eth.Contract([MinterAbi.coins], address);
  }

  async coins(index: number): Promise<string> {
    const callResult = await this.contract.methods.coins(index).call();
    return callResult.toLowerCase();
  }
}
