import Web3 from 'web3';

import { UNIV2LP_ABI } from '../abis/univ2-lp.abi';
import { ERC20Contract } from './erc20.contract';

export class UniV2LpContract extends ERC20Contract {
  constructor(address: string, web3: Web3) {
    super(address, web3);
    this.contract = new web3.eth.Contract(UNIV2LP_ABI, address);
  }

  async getReserves(): Promise<{ _reserve0: string; _reserve1: number }> {
    const callResult = await this.contract.methods.getReserves().call();
    return {
      // eslint-disable-next-line no-underscore-dangle
      _reserve0: callResult._reserve0,
      // eslint-disable-next-line no-underscore-dangle
      _reserve1: callResult._reserve1,
    };
  }

  async token0(): Promise<string> {
    const callResult = await this.contract.methods.token0().call();
    return callResult.toLowerCase();
  }

  async token1(): Promise<string> {
    const callResult = await this.contract.methods.token1().call();
    return callResult.toLowerCase();
  }
}
