import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AssetReference } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';

@Injectable()
export class CoinmarketcapAssetAnalyser implements AssetAnalyser {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  canAnalyseAsset() {
    return true;
  }

  async analyseAsset({ address }: AssetReference): Promise<AssetAnalysisResult> {
    try {
      const apiKey = this.config.get('COINMARKETCAP_API_KEY');
      if (!apiKey) {
        this.logger.error('Coinmarketcap API key not provided in icon load source config');
        return;
      }

      const {
        data: { data },
      } = await firstValueFrom(
        this.httpService.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/info', {
          // NOTE: For coins try to find by symbol not by address
          params: { address },
          headers: {
            ['X-CMC_PRO_API_KEY']: apiKey,
          },
        }),
      );

      if (!data || !Object.keys(data || {}).length) {
        return;
      }

      // TODO: Add more data here
      const { logo } = data[Object.keys(data)[0]];
      return {
        icons: [{ source: 'coinmarketcap', url: logo }],
      };
    } catch (e) {
      this.logger.warn('Error coinmarketcap loading icons', { address }, e);
    }
  }
}
