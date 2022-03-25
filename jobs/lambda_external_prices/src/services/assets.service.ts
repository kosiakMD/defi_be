import axios from 'axios';

import { tokenServiceUrl } from '../config';
import { logger } from '../utils/logger';

export class AssetsService {
  static async getAllAssets(): Promise<AssetsApiDto[]> {
    try {
      const { data } = await axios.get(`${tokenServiceUrl}/v1/assets/all`);
      return data;
    } catch (e: any) {
      logger.error('Get assets failed', e.message);
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
  chain: number;
  status: string;
  extensions?: any;
}
