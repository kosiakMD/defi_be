import { AbiItem } from 'web3-utils';

import { AssetPairData } from '../../interfaces';
import { LOGGER } from '../../logger/logger';
import { MULTICALL_ABI } from '../../utils/abi';
import { INPUT_ZEROES, GET_PAIR_CALL_HASH, RESERVES_CALL_HASH } from '../../utils/constants';
import { addSuffix } from '../../utils/string';
import { Web3Provider } from '../web3.provider';
import { UniswapReservesData, UniswapReservesResult } from './types/token';

export class MultiCall {
  async getReserves(
    pairs: string[],
    contractAddress: string,
  ): Promise<[number, UniswapReservesData]> {
    try {
      const web3 = Web3Provider.getWeb3();

      const contract = new web3.eth.Contract(MULTICALL_ABI as AbiItem[], contractAddress);

      const allReserves: UniswapReservesData = {};

      const aggCallsWeights = await contract.methods
        .aggregate([...pairs.map((pair) => [pair, RESERVES_CALL_HASH])])
        .call();

      const blockNumber = Number(aggCallsWeights.blockNumber);

      aggCallsWeights.returnData.forEach((reserveCallHash: string, index: number) => {
        const reserve0 = addSuffix(reserveCallHash.slice(2, 66));
        const reserve1 = addSuffix(reserveCallHash.slice(66, 130));
        const blockTimestampLast = addSuffix(reserveCallHash.slice(130));

        allReserves[pairs[index]] = {
          reserve0: web3.utils.hexToNumberString(reserve0),
          reserve1: web3.utils.hexToNumberString(reserve1),
          blockTimestampLast: web3.utils.toNumber(blockTimestampLast),
        };
      });
      return [blockNumber, allReserves];
    } catch (e) {
      LOGGER.error(e.message);
      throw e;
    }
  }

  async getPairsReserves(pairs: string[], contractAddress: string): Promise<UniswapReservesResult> {
    try {
      const chunkSize = 100;
      let blockNumberLast: number;
      const convertedReserves: UniswapReservesData = {};
      for (let i = 0, j = pairs.length; i < j; i += chunkSize) {
        const pairsSlice = pairs.slice(i, i + chunkSize);
        const [blockNumber, multiCallReserves] = await this.getReserves(
          pairsSlice,
          contractAddress,
        );
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

  async getPairs(assetPairs: AssetPairData[], contractAddress: string): Promise<string[]> {
    try {
      const web3 = Web3Provider.getWeb3();

      const contract = new web3.eth.Contract(MULTICALL_ABI as AbiItem[], contractAddress);

      const aggCallsWeights: { blockNumber: number; returnData: string[] } = await contract.methods
        .aggregate([
          ...assetPairs.map((pair) => [
            pair.factory,
            MultiCall.getPairInputData(pair.asset, pair.coin, GET_PAIR_CALL_HASH),
          ]),
        ])
        .call();

      return aggCallsWeights?.returnData.map((data) => {
        return addSuffix(String(data).slice(26));
      });
    } catch (e) {
      LOGGER.error(e.message);
      throw e;
    }
  }

  async getAssetsPairs(
    assetPairs: AssetPairData[],
    contractAddress: string,
  ): Promise<Map<string, AssetPairData[]>> {
    try {
      const assetPairsInfo = new Map<string, AssetPairData[]>();
      const chunkSize = 100;
      let count = 0;
      for (let i = 0; i < assetPairs.length; i += chunkSize) {
        const to = i + chunkSize > assetPairs.length ? assetPairs.length : i + chunkSize;
        const pairsSlice = assetPairs.slice(i, to);
        const resultData = await this.getPairs(pairsSlice, contractAddress);
        for (let j = 0; j < resultData.length; j++) {
          const info = assetPairs[count * chunkSize + j];
          const mapItem = assetPairsInfo.get(info.asset);
          info.pairAddress = resultData[j].toLowerCase();
          mapItem ? mapItem.push(info) : assetPairsInfo.set(info.asset, [info]);
        }
        count++;
      }
      return assetPairsInfo;
    } catch (e) {
      LOGGER.error(e.message);
      throw e;
    }
  }

  private static getPairInputData(address1: string, address2: string, hash: string): string {
    const inputAddress1 = INPUT_ZEROES.concat(address1.slice(2));
    const inputAddress2 = INPUT_ZEROES.concat(address2.slice(2));
    return hash.concat(inputAddress1).concat(inputAddress2);
  }
}
