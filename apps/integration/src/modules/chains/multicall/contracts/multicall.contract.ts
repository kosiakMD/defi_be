import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

import { MulticallAbi } from './multicall.abi';

// TODO: TBD Delete it
export class MulticallContract {
  private contract: Contract;

  constructor(private readonly web3: Web3, address: string) {
    this.contract = new web3.eth.Contract([MulticallAbi.aggregate], address);
  }

  async aggregate(data: string[][]): Promise<{ blockNumber: number; returnData: string[] }> {
    return await this.contract.methods.aggregate(data).call();
  }
}
