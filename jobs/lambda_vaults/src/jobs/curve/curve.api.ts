import axios from 'axios';

import { Logger } from '../../logger/logger.service';
import {
  FactoryAPYItem,
  FactoryV2PoolItem,
  PoolsAprs,
  MainPoolsGaugeRewards,
  CrvAprs,
} from './curve.api.interfaces';

export const curveApiUrl = 'https://api.curve.fi/api';

export class CurveApi {
  protected logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }

  async getMainPoolsAprs(): Promise<PoolsAprs> {
    try {
      const { data } = await axios.get(`https://stats.curve.fi/raw-stats/apys.json`);
      return data?.apy?.day;
    } catch (e) {
      this.logger.error(e, 'getMainPoolsAprs');
      throw e;
    }
  }

  async getMainPoolsCryptoAprs(): Promise<PoolsAprs> {
    try {
      const { data } = await axios.get('https://stats.curve.fi/raw-stats-crypto/apys.json');
      return data?.apy?.day;
    } catch (e) {
      this.logger.error(e, 'getMainPoolsCryptoAprs');
      throw e;
    }
  }

  async getCrvAprForMainPools(): Promise<CrvAprs> {
    try {
      const { data } = await axios.get(`${curveApiUrl}/getApys`);
      return data?.data;
    } catch (e) {
      this.logger.error(e, 'getCrvAprForMainPools');
      throw e;
    }
  }

  async getAdditionalRewardTokensInfo(): Promise<MainPoolsGaugeRewards> {
    try {
      const { data } = await axios.get(`${curveApiUrl}/getMainPoolsGaugeRewards`);
      return data?.data?.mainPoolsGaugeRewards;
    } catch (e) {
      this.logger.error(e, 'getAdditionalRewardTokensInfo');
      throw e;
    }
  }

  async getFactoryApysV2(): Promise<FactoryAPYItem[]> {
    try {
      const { data } = await axios.get(`${curveApiUrl}/getFactoryAPYs?version=2`);
      return data?.data?.poolDetails;
    } catch (e) {
      this.logger.error(e, 'getFactoryApysV2');
      throw e;
    }
  }

  async getFactoryV2Pools(): Promise<FactoryV2PoolItem[]> {
    try {
      const { data } = await axios.get(`${curveApiUrl}/getFactoryV2Pools`);
      return data?.data?.poolData;
    } catch (e) {
      this.logger.error(e, 'getFactoryV2Pools');
      throw e;
    }
  }

  async getMainPoolsAprPlg(): Promise<PoolsAprs> {
    try {
      const { data } = await axios.get(`https://stats.curve.fi/raw-stats-polygon/apys.json`);
      return data?.apy?.day;
    } catch (e) {
      this.logger.error(e, 'getMainPoolsAprPlg');
      throw e;
    }
  }

  async getMainPoolsAprAvax(): Promise<PoolsAprs> {
    try {
      const { data } = await axios.get(`https://stats.curve.fi/raw-stats-avalanche/apys.json`);
      return data?.apy?.day;
    } catch (e) {
      this.logger.error(e, 'getMainPoolsAprAvax');
      throw e;
    }
  }

  async getMainPoolsAprFtm(): Promise<PoolsAprs> {
    try {
      const { data } = await axios.get(`https://stats.curve.fi/raw-stats-ftm/apys.json`);
      return data?.apy?.day;
    } catch (e) {
      this.logger.error(e, 'getMainPoolsAprFtm');
      throw e;
    }
  }

  async getMainPoolsAprArbi(): Promise<PoolsAprs> {
    try {
      const { data } = await axios.get(`https://stats.curve.fi/raw-stats-arbitrum/apys.json`);
      return data?.apy?.day;
    } catch (e) {
      this.logger.error(e, 'getMainPoolsAprArbi');
      throw e;
    }
  }

  async getMainPoolsAprOpt(): Promise<PoolsAprs> {
    try {
      const { data } = await axios.get(`https://stats.curve.fi/raw-stats-optimism/apys.json`);
      return data?.apy?.day;
    } catch (e) {
      this.logger.error(e, 'getMainPoolsAprOpt');
      throw e;
    }
  }

  async getMainPoolsAprHarm(): Promise<PoolsAprs> {
    try {
      const { data } = await axios.get(`https://stats.curve.fi/raw-stats-harmony/apys.json`);
      return data?.apy?.day;
    } catch (e) {
      this.logger.error(e, 'getMainPoolsAprHarm');
      throw e;
    }
  }

  async getMainPoolsAprXdai(): Promise<PoolsAprs> {
    try {
      const { data } = await axios.get(`https://stats.curve.fi/raw-stats-xdai/apys.json`);
      return data?.apy?.day;
    } catch (e) {
      this.logger.error(e, 'getMainPoolsAprXdai');
      throw e;
    }
  }
}
