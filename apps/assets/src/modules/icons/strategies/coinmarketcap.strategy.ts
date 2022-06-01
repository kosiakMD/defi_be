import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { isZeroAddress } from '@app/common/utils';

import { AssetIcon, AssetReference } from '../types';
import { IconStrategy } from './icon-strategy';

type CoinmarketcapConfig = never;

export class CoinmarketcapStrategy extends IconStrategy<CoinmarketcapConfig> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async loadIcons({ symbol, address }: AssetReference): Promise<AssetIcon[]> {
    try {
      const apiKey = this.config.get('COINMARKETCAP_API_KEY');
      if (!apiKey) {
        this.logger.error('Coinmarketcap API key not provided in icon load source config');
        return [];
      }

      const {
        data: { data },
      } = await firstValueFrom(
        this.httpService.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/info', {
          // NOTE: For coins try to find by symbol not by address
          params: isZeroAddress(address) ? { symbol } : { address },
          headers: {
            ['X-CMC_PRO_API_KEY']: apiKey,
          },
        }),
      );

      if (!data || !Object.keys(data || {}).length) {
        return [];
      }

      const { logo } = data[Object.keys(data)[0]];
      return [{ url: logo }];
    } catch (e) {
      this.logger.warn('Error coinmarketcap loading icons', { symbol, address }, e);
      return [];
    }
  }
}
