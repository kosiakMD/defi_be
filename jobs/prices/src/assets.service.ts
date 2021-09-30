import axios from 'axios';

import { AssetsApiResponse } from './interfaces';
import { LOGGER } from './logger/logger';
import { toField } from './util';

export class AssetsService {
  static async getAssetsAndPairsFromDbByChain(
    assetsUrl: string,
    chainId: number,
  ): Promise<AssetsApiResponse[]> {
    try {
      const response = await axios.get(assetsUrl, {
        params: { chainId: chainId },
      });
      return response.data;
    } catch (e) {
      LOGGER.error(e, 'getAssetsAndPairsFromDbByChain');
      throw e;
    }
  }

  static async saveAssetsPairs(assetsUrl: string, data: AssetsApiResponse[]): Promise<void> {
    const chunkSize = 100;
    const promiseArray = [];
    for (let i = 0, j = data.length; i < j; i += chunkSize) {
      const to = toField(i, data.length, chunkSize);
      const sliceData = data.slice(i, to);
      promiseArray.push(axios.post(assetsUrl, sliceData));
    }
    try {
      await Promise.all(promiseArray);
    } catch (e) {
      LOGGER.error(e.message);
    }
  }
}
