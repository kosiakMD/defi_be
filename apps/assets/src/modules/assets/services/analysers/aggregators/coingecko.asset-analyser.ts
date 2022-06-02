/* eslint-disable camelcase */
import { CoinGeckoClient } from 'coingecko-api-v3';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CoingeckoPlatformEnum } from '@app/common';

import { AssetReference } from '../../../../../common/types/asset-reference';

import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';

@Injectable()
export class CoingeckoAssetAnalyser implements AssetAnalyser {
  private readonly coinGeckoClient = new CoinGeckoClient({
    timeout: 10000,
    autoRetry: true,
  });

  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  canAnalyseAsset() {
    return true;
  }

  async analyseAsset({ chainId, address }: AssetReference): Promise<AssetAnalysisResult> {
    try {
      const coingeckoChainId = CoingeckoPlatformEnum[ChainIdEnum[chainId]];
      const { image } = await this.coinGeckoClient.contract({
        id: coingeckoChainId as any,
        contract_address: address,
      });

      // TODO: Add more data here
      return {
        icons: Object.entries(image).map(([key, value]) => ({
          source: 'coingecko',
          label: key,
          url: value,
        })),
      };
    } catch (e) {
      this.logger.warn('Error coingecko loading icons', { chainId, address }, e);
    }
  }
}
