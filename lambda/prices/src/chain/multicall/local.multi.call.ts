import { CallInput, MultiCall } from '@indexed-finance/multicall';
import { BigNumber } from 'bignumber.js';

import { UNISWAP_PAIR_ABI } from '../uniswapv2pair/abi';
import { Web3Provider } from '../web3.provider';
import {
  TotalSupplies,
  TotalSuppliesResult,
  UniswapReservesData,
  UniswapReservesResult,
} from './types/token';

export class LocalMultiCall extends MultiCall {
  constructor() {
    super(Web3Provider.getWeb3());
  }

  async getPairsReserves(pairs: string[]): Promise<UniswapReservesResult> {
    const chunkSize = 100;
    let blockNumberLast: number;
    const convertedReserves: UniswapReservesData = {};
    for (let i = 0, j = pairs.length; i < j; i += chunkSize) {
      const pairsSlice = pairs.slice(i, i + chunkSize);
      const [blockNumber, multiCallReserves] = await super.getReserves(pairsSlice);
      blockNumberLast = blockNumber;
      for (const key in pairsSlice) {
        convertedReserves[pairsSlice[key]] = {
          reserve0: multiCallReserves[pairsSlice[key]].reserve0.toString(),
          reserve1: multiCallReserves[pairsSlice[key]].reserve1.toString(),
          blockTimestampLast: multiCallReserves[pairsSlice[key]].blockTimestampLast,
        };
      }
    }

    return {
      block: blockNumberLast,
      reserves: convertedReserves,
    };
  }

  async getTotalSupplies(pairs: string[]): Promise<TotalSuppliesResult> {
    const chunkSize = 50;
    let blockNumberLast: number;
    const convertedTotalSupplies: TotalSupplies = {};
    for (let i = 0, j = pairs.length; i < j; i += chunkSize) {
      const pairsSlice = pairs.slice(i, i + chunkSize);
      const inputs: CallInput[] = [];
      pairsSlice.map((p) => inputs.push({ target: p, function: 'totalSupply' }));
      const [blockNumber, multicallSupplies] = await this.multiCall(UNISWAP_PAIR_ABI, inputs);
      blockNumberLast = blockNumber;
      for (const key in pairsSlice) {
        convertedTotalSupplies[pairsSlice[key]] = new BigNumber(multicallSupplies[key].toString());
      }
    }

    return {
      block: blockNumberLast,
      totalSupplies: convertedTotalSupplies,
    };
  }
}
