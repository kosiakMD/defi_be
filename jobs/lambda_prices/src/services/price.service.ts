import axios from 'axios';

import { priceServiceUrl } from '../config';
import { logger } from '../utils/logger';

export class PriceService {
  static async saveAssetsPrices(data: PriceDto[]): Promise<void> {
    try {
      await axios.post(`${priceServiceUrl}/v1/prices/current`, data);
    } catch (e: any) {
      logger.error('Saving assets prices failed', e);
      throw e;
    }
  }
}

export interface PriceDto {
  address: string;
  price: number;
  chainId: number;
  currencyId: number;
}
