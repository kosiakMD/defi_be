import axios from 'axios';

import { priceServiceUrl } from '../config';
import { logger } from '../utils/logger';

export class PriceService {
  static async saveAssetsPrices(data: PriceDto[]): Promise<void> {
    try {
      await axios.post(`${priceServiceUrl}/v1/prices/current`, data);
    } catch (e) {
      logger.error('Saving assets prices failed', e);
      throw e;
    }
  }

  static async getTokensPrices(
    chainId: number,
    currencyId: number,
    addresses: string[],
  ): Promise<{ prices: { [key: string]: number } }> {
    const allTokens = addresses.join(',');
    try {
      const { data } = await axios.post(`${priceServiceUrl}/v1/prices/fetch`, {
        chain: chainId,
        addresses: allTokens,
        currency: currencyId,
      });
      return data;
    } catch (e) {
      logger.error('Loading assets prices failed', e);
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
