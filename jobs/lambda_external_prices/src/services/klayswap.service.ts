import axios from 'axios';

import { klaytnPublicAssetsApi } from '../config';
import type { KlaySwapResponse } from '../interfaces/klayswap.interface';
import { logger } from '../utils/logger';

export class KlaySwapService {
  static async getTokensPrices(): Promise<KlaySwapResponse[]> {
    try {
      const [, ...rest] = await axios
        .get(klaytnPublicAssetsApi)
        .then((responce) => responce.data || []);
      return rest;
    } catch (error) {
      logger.error('KlaySwap token list call failed ' + error.message);
      throw error;
    }
  }
}
