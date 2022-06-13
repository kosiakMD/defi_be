import Web3 from 'web3';

import { ERC20_ABI } from '../abis/erc20.abi';

export class ERC20Contract {
  protected contract;

  constructor(address: string, web3: Web3) {
    this.contract = new web3.eth.Contract(ERC20_ABI, address);
  }

  async getContractData(): Promise<{ name: string; symbol: string; decimals: number }> {
    const [name, symbol, decimals] = await Promise.all([
      this.contract.methods.name().call(),
      this.contract.methods.symbol().call(),
      this.contract.methods.decimals().call(),
    ]);
    return { name, symbol, decimals };
  }
}
