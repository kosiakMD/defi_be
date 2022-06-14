import Web3 from 'web3';

import { ERC20_BYTES32_ABI } from '../abis/erc20-bytes32.abi';

export class ERC20Bytes32Contract {
  protected contract;

  constructor(address: string, private readonly web3: Web3) {
    this.contract = new web3.eth.Contract(ERC20_BYTES32_ABI, address);
  }

  async getContractData(): Promise<{ name: string; symbol: string; decimals: number }> {
    const [name, symbol, decimals] = await Promise.all([
      this.contract.methods.name().call(),
      this.contract.methods.symbol().call(),
      this.contract.methods.decimals().call(),
    ]);
    return {
      name: this.web3.utils.hexToAscii(name).trim(),
      symbol: this.web3.utils.hexToAscii(symbol).trim(),
      decimals,
    };
  }
}
