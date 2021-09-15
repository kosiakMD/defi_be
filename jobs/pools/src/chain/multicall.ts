import { CallInput, MultiCall } from '@indexed-finance/multicall';
import { BigNumber } from 'bignumber.js';

import { UNIV2PAIR_ABI } from './abis/UNIV2PAIR';
import { UniswapPairReserves } from './dto/token';

export class MultiCallInternal extends MultiCall {
  constructor(protected readonly web3Instance) {
    super(web3Instance);
  }

  async getPairsReserves(pairs: string[]): Promise<Map<string, UniswapPairReserves>> {
    const chunkSize = 100;
    const convertedReserves: Map<string, UniswapPairReserves> = new Map<
      string,
      UniswapPairReserves
    >();
    for (let i = 0, j = pairs.length; i < j; i += chunkSize) {
      const pairsSlice = pairs.slice(i, i + chunkSize);
      const [, multiCallReserves] = await super.getReserves(pairsSlice);
      for (const key in pairsSlice) {
        convertedReserves.set(pairsSlice[key], {
          reserve0: new BigNumber(multiCallReserves[pairsSlice[key]].reserve0.toString()),
          reserve1: new BigNumber(multiCallReserves[pairsSlice[key]].reserve1.toString()),
          blockTimestampLast: multiCallReserves[pairsSlice[key]].blockTimestampLast,
        });
      }
    }

    return convertedReserves;
  }

  async getTotalSupplies(pairs: string[]): Promise<Map<string, BigNumber>> {
    const chunkSize = 50;
    const convertedTotalSupplies: Map<string, BigNumber> = new Map<string, BigNumber>();
    for (let i = 0, j = pairs.length; i < j; i += chunkSize) {
      const pairsSlice = pairs.slice(i, i + chunkSize);
      const inputs: CallInput[] = [];
      pairsSlice.map((p) => inputs.push({ target: p, function: 'totalSupply' }));
      const [, multicallSupplies] = await this.multiCall(UNIV2PAIR_ABI, inputs);
      for (const key in pairsSlice) {
        convertedTotalSupplies.set(
          pairsSlice[key],
          new BigNumber(multicallSupplies[key].toString()),
        );
      }
    }

    return convertedTotalSupplies;
  }
}
