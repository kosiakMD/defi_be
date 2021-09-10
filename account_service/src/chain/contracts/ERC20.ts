import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { ERC20_ABI } from '../abis/ERC20';

export class ERC20 {
  protected contract;

  constructor(address: string, web3Provider: Web3) {
    this.contract = new web3Provider.eth.Contract(ERC20_ABI as AbiItem[], address);
  }

  async getContractData(): Promise<{ name?: string; symbol?: string; decimals?: number }> {
    const [name, symbol, decimals] = await Promise.all([
      this.contract.methods.name().call(),
      this.contract.methods.symbol().call(),
      this.contract.methods.decimals().call(),
    ]);
    return {
      name: name,
      symbol: symbol,
      decimals: decimals,
    };
  }
}
