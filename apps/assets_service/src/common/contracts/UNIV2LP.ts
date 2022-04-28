import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { UNIV2LP_ABI } from '../abis/UNIV2LP';
import { ERC20 } from './ERC20';

export class UNIV2LP extends ERC20 {
  constructor(address: string, web3Provider: Web3) {
    super(address, web3Provider);
    this.contract = web3Provider.eth
      ? new web3Provider.eth.Contract(UNIV2LP_ABI as AbiItem[], address)
      : {};
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
