/* eslint-disable camelcase */
import { CoinGeckoClient } from 'coingecko-api-v3';

import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CoingeckoPlatformEnum } from '@app/common';

import { AssetIcon, AssetReference } from '../types';
import { IconStrategy } from './icon-strategy';

type CoingeckoConfig = never;

export class CoingeckoStrategy extends IconStrategy<CoingeckoConfig> {
  private readonly coinGeckoClient = new CoinGeckoClient({
    timeout: 10000,
    autoRetry: true,
  });

  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {
    super();
  }

  async loadIcons({ chainId, address }: AssetReference): Promise<AssetIcon[]> {
    try {
      const coingeckoChainId = CoingeckoPlatformEnum[ChainIdEnum[chainId]];
      const { image } = await this.coinGeckoClient.contract({
        id: coingeckoChainId as any,
        contract_address: address,
      });

      return Object.entries(image).map(([key, value]) => ({ label: key, url: value }));
    } catch (e) {
      this.logger.warn('Error coingecko loading icons', { chainId, address }, e);
      return [];
    }
  }
}
