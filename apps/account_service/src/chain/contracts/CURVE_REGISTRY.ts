import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { Address } from '@app/common';

import { CURVE_REGISTRY_ABI } from '../abis/CURVE_REGISTRY';

export class CURVE_REGISTRY {
  protected contract;

  constructor(address: string, web3Provider: Web3) {
    this.contract = new web3Provider.eth.Contract(CURVE_REGISTRY_ABI as AbiItem[], address);
  }

  // TODO: Multicall
  async getCoinsForLpToken(token: Address): Promise<Address[]> {
    const poolAddress = await this.contract.methods.get_pool_from_lp_token(token).call();

    const [[nCoins], coinAddressesAndBlanks] = await Promise.all([
      this.contract.methods.get_n_coins(poolAddress).call(),
      this.contract.methods.get_coins(poolAddress).call(),
    ]);

    return coinAddressesAndBlanks.slice(0, Number(nCoins));
  }
}
