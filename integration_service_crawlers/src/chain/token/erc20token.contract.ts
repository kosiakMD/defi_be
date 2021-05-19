import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';

import { ERC20_ABI } from './abi';

export class Erc20TokenContract {
  private contract: Contract;
  private web3: Web3;

  constructor(protected readonly web3Provider: Web3, protected readonly address: string) {
    this.web3 = web3Provider;
    this.contract = new web3Provider.eth.Contract(ERC20_ABI as AbiItem[], address);
  }

  async name(): Promise<string> {
    return this.contract.methods.name().call();
  }

  async symbol(): Promise<string> {
    return this.contract.methods.symbol().call();
  }

  async decimals(): Promise<string> {
    return this.contract.methods.decimals().call();
  }

  async totalSupply(): Promise<string> {
    return this.contract.methods.totalSupply().call();
  }
}
