import axios from 'axios';

import { tokenServiceUrl } from '../config';
import { logger } from '../utils/logger';

export class AssetsService {
  // TODO: We should use other API here
  static async getAssetsAndPairsByChain(chainId: number): Promise<AssetsApiDto[]> {
    try {
      const { data } = await axios.get(`${tokenServiceUrl}/v1/assets/pools`, {
        params: { chainId },
      });
      return data;
    } catch (e: any) {
      logger.error('Get assets failed', e);
      throw e;
    }
  }

  static async saveAssets(request: AddAssetsRequest): Promise<void> {
    try {
      await axios.post(`${tokenServiceUrl}/v1/assets`, request);
    } catch (e: any) {
      logger.error('Save assets pairs failed', e);
      throw e;
    }
  }
}

export interface AddAssetsRequest {
  address: string;
  chain: number;
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
