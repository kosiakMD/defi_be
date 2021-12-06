import axios from 'axios';

import { priceServiceUrl } from '../config';
import { logger } from '../utils/logger';

export class PriceService {
  static async saveAssetsPrices(data: CurrentPriceInterface[]): Promise<void> {
    try {
      await axios.post(`${priceServiceUrl}/v1/prices/current`, data);
    } catch (e) {
      logger.error('Saving assets prices failed', e.message);
      throw e;
    }
  }

  static async getAllAssetsPrices(): Promise<CurrentPriceInterface[]> {
    try {
      const { data } = await axios.get(`${priceServiceUrl}/v1/prices/current`);
      return data;
    } catch (e) {
      logger.error('Getting assets prices failed', e.message);
      throw e;
    }
  }
}

export interface CurrentPriceInterface {
  address: string;
  price: number;
  chainId: number;
  currencyId: number;
  sourceId: number;
  updatedAt?: string;
}
