import axios from 'axios';

import { LambdaRequestInterface, PriceResponse } from './interfaces';
import { LOGGER } from './logger/logger';

export class PriceService {
  static async saveAssetsPrices(priceUrl: string, data: PriceResponse[]): Promise<void> {
    try {
      await axios.post(priceUrl + '/current', data);
    } catch (e) {
      LOGGER.error(e, 'saveAssetsPrices');
    }
  }

  static async getTokensPrices(priceUrl: string, requestParams: LambdaRequestInterface) {
    const allTokens = [
      requestParams.wrappedCoin,
      ...requestParams.stableCoins,
      ...requestParams.whiteListCoins,
    ].join(',');
    try {
      const response = await axios.post(priceUrl + '/fetch', {
        chain: requestParams.chainId,
        addresses: allTokens,
        currency: requestParams.currencyId,
      });
      return response?.data;
    } catch (e) {
      LOGGER.error(e, 'saveAssetsPrices');
    }
  }
}
