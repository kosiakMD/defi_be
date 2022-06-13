import Web3 from 'web3';

import { EllipsisLpAbi } from '../abis/ellipsys-lp.abi';
import { ERC20Contract } from './erc20.contract';

export class EllipsysLpContact extends ERC20Contract {
  constructor(address: string, web3: Web3) {
    super(address, web3);
    this.contract = new web3.eth.Contract([EllipsisLpAbi.minter], address);
  }

  async minter(): Promise<string> {
    const callResult = await this.contract.methods.minter().call();
    return callResult.toLowerCase();
  }
}
