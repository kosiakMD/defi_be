import axios from 'axios';

import { Logger } from '../../logger/logger.service';

export class AnchorApi {
  protected logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }

  async getAncUstLpRewardApy() {
    try {
      const { data } = await axios.get(`https://api.anchorprotocol.com/api/v2/ust-lp-reward`);
      return data?.apy;
    } catch (e) {
      this.logger.error(e, 'getUstLpRewardApy');
      throw e;
    }
  }
}
