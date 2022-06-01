import { PricesPayload } from 'apps/price/src/modules/prices/dto';
import axios from 'axios';

import { ChainIdEnum, CurrencyEnum, PriceResponseDto } from '@app/common';

import { priceServiceUrl } from '../config';
import { logger } from '../utils/logger';

export class PriceService {
  static async getAssetsPrice(
    requestData: AssetsPricesRequestData,
  ): Promise<PriceResponseDto<PricesPayload>> {
    try {
      const { data } = await axios.post(`${priceServiceUrl}/v1/prices`, requestData);
      return data;
    } catch (e) {
      logger.error('Getting assets prices failed', e.message);
      throw e;
    }
  }

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
      logger.error('Getting all assets prices failed', e.message);
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

export interface AssetsPricesRequestData {
  chain: ChainIdEnum;
  addresses: string;
  currency?: CurrencyEnum;
  timestamps?: string;
}
