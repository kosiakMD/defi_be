import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { Address } from '@app/common';
import { CURVE_MAIN_COIN_ADDRESS, ZERO_ADDRESS } from '@app/common/constant';

export class CurveRegistryContract {
  protected contract;

  constructor(address: string, web3Provider: Web3, abi: AbiItem[]) {
    this.contract = new web3Provider.eth.Contract(abi, address);
  }

  // TODO: Multicall
  async getCoinsForLpToken(poolAddress: string): Promise<Address[]> {
    if (poolAddress === ZERO_ADDRESS) {
      throw new Error('Address is not a curve pool');
    }
    const [[nCoins], coinAddressesAndBlanks] = await Promise.all([
      this.contract.methods.get_n_coins(poolAddress).call(),
      this.contract.methods.get_coins(poolAddress).call(),
    ]);

    return coinAddressesAndBlanks.slice(0, Number(nCoins))?.map((address) => {
      return address === CURVE_MAIN_COIN_ADDRESS ? ZERO_ADDRESS : address.toLowerCase();
    });
  }

  async getPoolFromLpToken(lpAddress: string) {
    return await this.contract.methods.get_pool_from_lp_token(lpAddress).call();
  }
}
