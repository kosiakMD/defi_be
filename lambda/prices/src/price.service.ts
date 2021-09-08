import axios from 'axios';

import { PriceResponse } from './interfaces';
import { LOGGER } from './logger/logger';

export class PriceService {
  static async saveAssetsPrices(priceUrl: string, data: PriceResponse[]): Promise<void> {
    try {
      await axios.post(priceUrl, data);
    } catch (e) {
      LOGGER.error(e, 'saveAssetsPrices');
    }
  }
}
