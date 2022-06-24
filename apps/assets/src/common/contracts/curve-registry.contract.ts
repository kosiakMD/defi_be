import { JsonFragment } from '@ethersproject/abi';
import { MultiCall } from '@indexed-finance/multicall';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { Address } from '@app/common';
import { CURVE_MAIN_COIN_ADDRESS, ZERO_ADDRESS } from '@app/common/constant';
import { MulticallMethodsEnum } from '@app/common/jobs/multicall.methods.enum';

export class CurveRegistryContract {
  protected abi: JsonFragment[];
  protected address: string;
  protected multicall: MultiCall;

  constructor(address: string, web3: Web3, abi: AbiItem[]) {
    this.abi = JSON.parse(abi.toString());
    this.address = address;
    this.multicall = new MultiCall(web3);
  }

  async getCoinsForLpToken(poolAddress: string): Promise<Address[]> {
    if (poolAddress === ZERO_ADDRESS) {
      throw new Error('Address is not a curve pool');
    }
    const calls = [];
    calls.push({
      target: this.address,
      function: MulticallMethodsEnum.getNCoins,
      args: [poolAddress],
    });
    calls.push({
      target: this.address,
      function: MulticallMethodsEnum.getCoins,
      args: [poolAddress],
    });
    const [, [[nCoins], coinAddressesAndBlanks]] = await this.multicall.multiCall(this.abi, calls);

    return coinAddressesAndBlanks.slice(0, Number(nCoins))?.map((address) => {
      return address === CURVE_MAIN_COIN_ADDRESS ? ZERO_ADDRESS : address.toLowerCase();
    });
  }

  async getPoolFromLpToken(lpAddress: string) {
    const calls = [
      {
        target: this.address,
        function: MulticallMethodsEnum.getPoolFromLpToken,
        args: [lpAddress],
      },
    ];
    const [, pool] = await this.multicall.multiCall(this.abi, calls);
    return pool;
  }
}
