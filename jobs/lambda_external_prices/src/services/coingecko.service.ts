import axios from 'axios';

import { coingeckoApiUrl } from '../config';
import { logger } from '../utils/logger';

export class CoingeckoService {
  static async simpleTokenPrice(input: {
    platformId: string;
    contractAddresses: string;
    vsCurrencies: string;
  }) {
    try {
      const { data } = await axios.get(
        `${coingeckoApiUrl}/api/v3/simple/token_price/${input.platformId}`,
        {
          params: {
            // eslint-disable-next-line camelcase
            contract_addresses: input.contractAddresses,
            // eslint-disable-next-line camelcase
            vs_currencies: input.vsCurrencies,
          },
        },
      );
      return data;
    } catch (e) {
      logger.error('Coingecko simpleTokenPrice call failed ' + e.message);
      throw e;
    }
  }

  static async simplePrice(input: { ids: string; vsCurrencies: string }) {
    try {
      const { data } = await axios.get(`${coingeckoApiUrl}/api/v3/simple/price`, {
        params: {
          // eslint-disable-next-line camelcase
          ids: input.ids,
          // eslint-disable-next-line camelcase
          vs_currencies: input.vsCurrencies,
        },
      });
      return data;
    } catch (e) {
      logger.error('Coingecko simplePrice call failed ' + e.message);
      throw e;
    }
  }
}
