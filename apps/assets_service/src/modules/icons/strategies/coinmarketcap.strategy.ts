import { IconConfig } from '../icons.service';
import { IconsStrategy } from './icons-strategy';

export class CoinmarketcapStrategy extends IconsStrategy {
  constructor(sourceConfig) {
    super(sourceConfig.name, sourceConfig);
  }

  async loadIcons(iconConfig: IconConfig, httpService) {
    try {
      const response = await httpService
        .get(this.sourceConfig.config.url, {
          params: { symbol: iconConfig.symbol },
          headers: this.sourceConfig.config.headers,
        })
        .toPromise();

      if (response?.data) {
        const { logo } = response.data.data[iconConfig.symbol][0];
        return logo;
      }
    } catch (e) {
      return [];
    }
  }
}
