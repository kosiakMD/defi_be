import { HttpService } from '@nestjs/axios';

import { IconConfig } from './icons.service';
import { CoingeckoStrategy } from './strategies/coingecko.strategy';
import { CoinmarketcapStrategy } from './strategies/coinmarketcap.strategy';

const iconSourcesStrategiesMap = {
  COINGECKO: CoingeckoStrategy,
  COINMARKETCAP: CoinmarketcapStrategy,
};

export class IconsFactory {
  public static async getInstance(
    sourceConfig: any,
    iconConfig: IconConfig,
    httpService: HttpService,
  ): Promise<string | string[]> {
    const strategy = new iconSourcesStrategiesMap[sourceConfig.name](sourceConfig);
    return strategy.loadIcons(iconConfig, httpService);
  }
}
