import axios from 'axios';

import { priceServiceUrl } from '../config';
import { logger } from '../utils/logger';

export class PriceService {
  static async fetchPrices(request: PriceFetchRequest): Promise<PriceFetchResponse> {
    try {
      const { data } = await axios.post<PriceFetchResponse>(`${priceServiceUrl}/v1/prices/fetch`, {
        chain: request.chainId,
        currency: request.currencyId,
        addresses: request.addresses.join(','),
      });
      return data;
    } catch (e) {
      logger.error('Saving assets prices failed', e);
      throw e;
    }
  }
}

export interface PriceFetchRequest {
  chainId: number;
  currencyId: number;
  addresses: string[];
}

export interface PriceFetchResponse {
  prices: { [token: string]: string }
}
