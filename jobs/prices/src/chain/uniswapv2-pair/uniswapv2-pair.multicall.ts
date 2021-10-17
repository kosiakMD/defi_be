import { multicallContractAddress } from '../../config';
import { GET_PAIR_CALL_HASH, INPUT_ZEROES, RESERVES_CALL_HASH } from '../../utils/constants';
import { logger } from '../../utils/logger';
import { MulticallContract } from '../multicall/multicall.contract';
import { web3 } from '../web3';

const GET_PAIRS_CHUNK_SIZE = 100;
const GET_RESERVES_CHUNK_SIZE = 100;

const add0xSuffix = (str: string): string => `0x${str}`;

export class UniSwapV2PairMulticall {
  private multicallContract = new MulticallContract(
    web3,
    multicallContractAddress,
  );

  async getPairsReserves(pairs: string[]): Promise<UniswapReservesData> {
    try {
      const reserves: UniswapReservesData = {};
      for (let index = 0; index < pairs.length; index += GET_PAIRS_CHUNK_SIZE) {
        const pairsSlice = pairs.slice(index, index + GET_PAIRS_CHUNK_SIZE);
        const [, sliceReserves] = await this.getReservesForBatch(pairsSlice);
        Object.assign(reserves, sliceReserves);
      }
      return reserves;
    } catch (e) {
      logger.error('Get reserves batch multicall failed', e);
      throw e;
    }
  }

  private async getReservesForBatch(pairs: string[]): Promise<[number, UniswapReservesData]> {
    try {
      const allReserves: UniswapReservesData = {};

      const aggCallsWeights = await this.multicallContract
        .aggregate([...pairs.map((pair) => [pair, RESERVES_CALL_HASH])]);

      const blockNumber = Number(aggCallsWeights.blockNumber);

      aggCallsWeights.returnData.forEach((reserveCallHash: string, index: number) => {
        const reserve0 = add0xSuffix(reserveCallHash.slice(2, 66));
        const reserve1 = add0xSuffix(reserveCallHash.slice(66, 130));
        const blockTimestampLast = add0xSuffix(reserveCallHash.slice(130));

        allReserves[pairs[index]] = {
          reserve0: web3.utils.hexToNumberString(reserve0),
          reserve1: web3.utils.hexToNumberString(reserve1),
          blockTimestampLast: web3.utils.toNumber(blockTimestampLast),
        };
      });
      return [blockNumber, allReserves];
    } catch (e) {
      logger.error('Get reserves multicall failed', e);
      throw e;
    }
  }

  // TODO: Requests and responses should have different types here
  async getAssetsPairs(assetPairs: AssetPairData[]): Promise<AssetPairData[]> {
    try {
      for (let chunkStart = 0; chunkStart < assetPairs.length; chunkStart += GET_RESERVES_CHUNK_SIZE) {
        const chunkAssetPairs = assetPairs.slice(chunkStart, chunkStart + GET_RESERVES_CHUNK_SIZE);
        const pairs = await this.getPairsForBatch(chunkAssetPairs);

        for (let index = 0; index < pairs.length; index++) {
          const assetPair = chunkAssetPairs[index];
          assetPair.pairAddress = pairs[index].toLowerCase();
        }
      }
      return assetPairs;
    } catch (e) {
      logger.error('Get pairs batch multicall failed', e);
      throw e;
    }
  }

  private async getPairsForBatch(assetPairs: AssetPairData[]): Promise<string[]> {
    try {
      const multicallResponse: { returnData: string[] } = await this.multicallContract
        .aggregate([
          ...assetPairs.map((pair) => [
            pair.factoryAddress,
            UniSwapV2PairMulticall.getPairInputData(pair.asset, pair.baseAsset, GET_PAIR_CALL_HASH),
          ]),
        ]);

      return multicallResponse?.returnData.map((data) => {
        return add0xSuffix(String(data).slice(26));
      });
    } catch (e) {
      logger.error('Get pairs multicall failed', e);
      throw e;
    }
  }


  private static getPairInputData(address1: string, address2: string, hash: string): string {
    const inputAddress1 = INPUT_ZEROES.concat(address1.slice(2));
    const inputAddress2 = INPUT_ZEROES.concat(address2.slice(2));
    return hash.concat(inputAddress1).concat(inputAddress2);
  }
}

export interface UniswapPairReserves {
  reserve0: string;
  reserve1: string;
  blockTimestampLast: number;
}

export interface UniswapReservesData {
  [key: string]: UniswapPairReserves;
}

export interface AssetPairData {
  baseAsset: string;
  asset: string;
  factoryAddress: string;
  protocolName: string;
  pairAddress?: string;
}
