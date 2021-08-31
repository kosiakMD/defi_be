import axios from 'axios';

import { AssetsApiResponse } from './interfaces';
import { LOGGER } from './logger/logger';

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
    try {
      await axios.post(assetsUrl, data);
    } catch (e) {
      LOGGER.error(e, 'saveAssetsPairs');
    }
  }
}
