import Web3 from 'web3';

import { EllipsisLpAbi } from '../abis/ellipsys-lp.abi';
import { ERC20 } from './erc20.contract';

export class ELLIPSIS_LP extends ERC20 {
  constructor(address: string, web3Provider: Web3) {
    super(address, web3Provider);
    this.contract = new web3Provider.eth.Contract([EllipsisLpAbi.minter], address);
  }

  async minter(): Promise<string> {
    const callResult = await this.contract.methods.minter().call();
    return callResult.toLowerCase();
  }
}
