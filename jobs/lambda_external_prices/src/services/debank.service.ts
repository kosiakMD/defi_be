import axios from 'axios';

import { debankApiUrl } from '../config';
import { logger } from '../utils/logger';

export class DebankService {
  static async getTokensPrices(requestStr: string) {
    try {
      const { data } = await axios.get(`${debankApiUrl}/v1/token/list_by_ids?${requestStr}`);
      return data;
    } catch (e) {
      logger.error('Debank token list call failed ' + e.message);
      throw e;
    }
  }
}
