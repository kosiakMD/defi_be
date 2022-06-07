import { MultiCall } from '@indexed-finance/multicall';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { Logger } from '@app/common/Logger/Logger.service';
import { CURVE_MAIN_COIN_ADDRESS, ZERO_ADDRESS } from '@app/common/constant';
import { MulticallMethodsEnum } from '@app/common/jobs/multicall.methods.enum';

import { CURVE_LP_ABI } from '../abis/curver-lp.abi';

export class CURVE_LP {
  protected contract;
  protected multicall;

  constructor(protected address: string, protected logger: Logger, web3Provider: Web3) {
    this.contract = new web3Provider.eth.Contract(CURVE_LP_ABI as AbiItem[], address);
    this.multicall = new MultiCall(web3Provider);
  }

  async getCoinsForLpToken(): Promise<string[]> {
    try {
      const inputs = Array.from(Array(8).keys()).map((key) => ({
        target: this.address,
        function: MulticallMethodsEnum.coins,
        args: [key],
      }));
      const [, result] = await this.multicall.multiCall(CURVE_LP_ABI, inputs);
      return result
        .filter((address) => address)
        .map((address) => {
          return address === CURVE_MAIN_COIN_ADDRESS ? ZERO_ADDRESS : address.toLowerCase();
        });
    } catch (e) {
      this.logger.error('Get Curve coins for LP failed', e);
      throw e;
    }
  }

  async getMinter() {
    try {
      return (await this.contract.methods.minter().call())?.toLowerCase();
    } catch (e) {
      return ZERO_ADDRESS;
    }
  }
}
