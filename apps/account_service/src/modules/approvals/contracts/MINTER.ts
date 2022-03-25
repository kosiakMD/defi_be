import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { Logger } from '@app/common/Logger/Logger.service';
import { CURVE_MAIN_COIN_ADDRESS, ZERO_ADDRESS } from '@app/common/constant';

import { MinterAbi } from '../abis/MINTER_ABI';

export class MINTER {
  protected contract;

  constructor(protected address: string, web3Provider: Web3, protected logger: Logger) {
    this.contract = new web3Provider.eth.Contract([MinterAbi.coins] as AbiItem[], address);
  }

  async coins(index: number): Promise<string> {
    const callResult = await this.contract.methods.coins(index).call();
    return callResult.toLowerCase();
  }

  async getCoinsArray() {
    try {
      const promises = [];
      Array.from(Array(8).keys()).forEach((index) => {
        promises.push(this.contract.methods.coins(index).call());
      });
      const contractResult = await Promise.allSettled(promises);
      return contractResult
        .filter((result) => result.status === 'fulfilled')
        .map((resp) => {
          const value = (resp as PromiseFulfilledResult<string>).value;
          return value === CURVE_MAIN_COIN_ADDRESS ? ZERO_ADDRESS : value.toLowerCase();
        });
    } catch (e: any) {
      this.logger.error(e, 'getCoinsArray');
      throw e;
    }
  }
}
