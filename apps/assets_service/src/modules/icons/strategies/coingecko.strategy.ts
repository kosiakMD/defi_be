import { ChainIdEnum, CoingeckoPlatformEnum } from '@app/common';

import { IconConfig } from '../icons.service';
import { IconsStrategy } from './icons-strategy';

export class CoingeckoStrategy extends IconsStrategy {
  constructor(sourceConfig) {
    super(sourceConfig.name, sourceConfig);
  }

  async loadIcons(iconConfig: IconConfig, httpService): Promise<any> {
    try {
      const chainId = CoingeckoPlatformEnum[ChainIdEnum[iconConfig.chainId]];
      const response = await httpService
        .get(`${this.sourceConfig.config.url}/${chainId}/contract/${iconConfig.address}`)
        .toPromise();

      if (response?.data) {
        return Object.values(response?.data.image);
      }
    } catch (e) {
      return [];
    }
  }
}
