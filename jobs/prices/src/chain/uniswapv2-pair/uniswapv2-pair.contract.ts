import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

import { UNISWAP_PAIR_ABI } from './abi';

export class UniSwapV2PairContract {
  private contract: Contract;

  constructor(private readonly web3: Web3, address: string) {
    this.contract = new web3.eth.Contract(UNISWAP_PAIR_ABI, address);
  }

  async token0(): Promise<string> {
    return await this.contract.methods.token0().call();
  }

  async token1(): Promise<string> {
    return await this.contract.methods.token1().call();
  }
}
