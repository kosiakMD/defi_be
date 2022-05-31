import Web3 from 'web3';

import { EllipsisLpAbi } from '../abis/ellipsis-lp-abi';
import { ERC20Contract } from './erc20.contract';

export class EllipsisLpContract extends ERC20Contract {
  constructor(address: string, web3Provider: Web3) {
    super(address, web3Provider);
    this.contract = new web3Provider.eth.Contract([EllipsisLpAbi.minter], address);
  }

  async minter(): Promise<string> {
    const callResult = await this.contract.methods.minter().call();
    return callResult.toLowerCase();
  }
}
