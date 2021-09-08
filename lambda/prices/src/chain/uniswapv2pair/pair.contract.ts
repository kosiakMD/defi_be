import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';

import { UNISWAP_PAIR_ABI } from './abi';

export class PairContract {
  private contract: Contract;
  private web3: Web3;

  constructor(protected readonly web3Provider: Web3, protected readonly address: string) {
    this.web3 = web3Provider;
    this.contract = new web3Provider.eth.Contract(UNISWAP_PAIR_ABI as AbiItem[], address);
  }

  async token0(): Promise<string> {
    return await this.contract.methods.token0().call();
  }

  async token1(): Promise<string> {
    return await this.contract.methods.token1().call();
  }
}
