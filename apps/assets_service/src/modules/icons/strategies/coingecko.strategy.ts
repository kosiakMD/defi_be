import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CoingeckoPlatformEnum } from '@app/common';

import { AssetIcon, AssetReference } from '../types';
import { IconStrategy } from './icon-strategy';

type CoingeckoConfig = never;

export class CoingeckoStrategy extends IconStrategy<CoingeckoConfig> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async loadIcons({ chainId, address }: AssetReference): Promise<AssetIcon[]> {
    try {
      const coingeckoChainId = CoingeckoPlatformEnum[ChainIdEnum[chainId]];
      const { data } = await firstValueFrom(
        this.httpService.get(
          `https://api.coingecko.com/api/v3/coins/${coingeckoChainId}/contract/${address}`,
        ),
      );

      const images: { [key: string]: string } = data?.image || {};
      return Object.entries(images).map(([key, value]) => ({ label: key, url: value }));
    } catch (e) {
      this.logger.warn('Error coingecko loading icons', { chainId, address }, e);
      return [];
    }
  }
}
