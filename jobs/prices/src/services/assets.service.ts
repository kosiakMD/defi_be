import axios from 'axios';

import { tokenServiceUrl } from '../config';
import { logger } from '../utils/logger';

const SAVE_ASSETS_BATCH_SIZE = 50;

export class AssetsService {
  static async getAssetsAndPairsByChain(chainId: number): Promise<AssetsApiDto[]> {
    try {
      const { data } = await axios.get(`${tokenServiceUrl}/v1/assets/pools`, {
        params: { chainId },
      });
      return data;
    } catch (e) {
      logger.error('Get assets failed', e);
      throw e;
    }
  }

  static async saveAssetsPairs(data: AssetsApiDto[]): Promise<void> {
    const promises = [];
    for (let index = 0; index < data.length; index += SAVE_ASSETS_BATCH_SIZE) {
      const sliceData = data.slice(index, index + SAVE_ASSETS_BATCH_SIZE);
      // TODO: This should be separate method to store pairs only
      promises.push(axios.post(`${tokenServiceUrl}/v1/assets/pools`, sliceData));
    }

    try {
      await Promise.all(promises);
    } catch (e) {
      logger.error('Save assets pairs failed', e);
      throw e;
    }
  }
}

export interface AssetsApiDto {
  id?: number;
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  chainId: number;
  pairs?: Pair[];
  pairProtocols?: Protocol[];
}

export interface Pair {
  address: string;
  type: string;
  tokens?: Token[];
}

export interface Token {
  tokenAddress?: string;
  pairPosition?: number;
  decimals?: number;
  reserved?: string;
}

export interface Protocol {
  address: string;
  name: string;
}
