import axios from 'axios';

import { cardanoPublicAssetsApi } from '../config';
import { SUNDAE_GRAPHQL_QUERY } from '../constants/sundae.graphql';
import type { SundaeSwapResponse } from '../interfaces/sundaeswap.interface';
import { logger } from '../utils/logger';

export class SundaeSwapService {
  static async getTokensPrices(): Promise<SundaeSwapResponse[]> {
    try {
      return axios
        .post(cardanoPublicAssetsApi + '/graphql', {
          query: SUNDAE_GRAPHQL_QUERY,
          variables: { pageSize: 200 },
        })
        .then((responce) => responce.data?.data?.poolsPopular || []);
    } catch (e) {
      logger.error('SundaeSwap token list call failed ' + e.message);
      throw e;
    }
  }
}
