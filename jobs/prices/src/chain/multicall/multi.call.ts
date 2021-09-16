import { AbiItem } from 'web3-utils';

import { LOGGER } from '../../logger/logger';
import { MULTICALL_ABI } from '../../utils/abi';
import { RESERVES_CALL_HASH } from '../../utils/constants';
import { addSuffix } from '../../utils/string';
import { Web3Provider } from '../web3.provider';
import { UniswapReservesData, UniswapReservesResult } from './types/token';

export class MultiCall {
  async getReserves(pairs: string[]): Promise<[number, UniswapReservesData]> {
    const web3 = Web3Provider.getWeb3();

    const contract = new web3.eth.Contract(
      MULTICALL_ABI as AbiItem[],
      process.env.CONTRACT_ADDRESS,
    );

    const allReserves: UniswapReservesData = {};

    const aggCallsWeights = await contract.methods
      .aggregate([...pairs.map((pair) => [pair, RESERVES_CALL_HASH])])
      .call();

    const blockNumber = +aggCallsWeights.blockNumber;

    aggCallsWeights.returnData.forEach((reserveCallHash: string, index: number) => {
      const reserve0 = addSuffix(reserveCallHash.slice(2, 66));
      const reserve1 = addSuffix(reserveCallHash.slice(67, 129));
      const blockTimestampLast = addSuffix(reserveCallHash.slice(130));

      allReserves[pairs[index]] = {
        reserve0: web3.utils.hexToNumberString(reserve0),
        reserve1: web3.utils.hexToNumberString(reserve1),
        blockTimestampLast: web3.utils.toNumber(blockTimestampLast),
      };
    });
    return [blockNumber, allReserves];
  }

  async getPairsReserves(pairs: string[]): Promise<UniswapReservesResult> {
    try {
      const chunkSize = 100;
      let blockNumberLast: number;
      const convertedReserves: UniswapReservesData = {};
      for (let i = 0, j = pairs.length; i < j; i += chunkSize) {
        const pairsSlice = pairs.slice(i, i + chunkSize);
        const [blockNumber, multiCallReserves] = await this.getReserves(pairsSlice);
        blockNumberLast = blockNumber;
        for (const key in pairsSlice) {
          convertedReserves[pairsSlice[key]] = multiCallReserves[pairsSlice[key]];
        }
      }

      return {
        block: blockNumberLast,
        reserves: convertedReserves,
      };
    } catch (e) {
      LOGGER.error(e.message);
      throw e;
    }
  }
}
