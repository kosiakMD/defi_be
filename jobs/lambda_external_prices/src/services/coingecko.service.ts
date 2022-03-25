import axios from 'axios';

import { coingeckoApiUrl } from '../config';
import { CoingeckoRequestItemIds } from '../interfaces/coingecko.interface';
import { logger } from '../utils/logger';
import { preparePricesCoingeckoId } from '../utils/modifyData';

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
    } catch (e: any) {
      logger.error('Coingecko simpleTokenPrice call failed ' + e.message);
      throw e;
    }
  }

  static async simplePrice(input: {
    ids: string;
    vsCurrencies: string;
    extras: CoingeckoRequestItemIds;
  }) {
    try {
      const { data } = await axios.get(`${coingeckoApiUrl}/api/v3/simple/price`, {
        params: {
          // eslint-disable-next-line camelcase
          ids: input.ids,
          // eslint-disable-next-line camelcase
          vs_currencies: input.vsCurrencies,
        },
      });
      return input.extras ? preparePricesCoingeckoId(data, input.extras) : data;
    } catch (e: any) {
      logger.error('Coingecko simplePrice call failed ' + e.message);
      throw e;
    }
  }
}
