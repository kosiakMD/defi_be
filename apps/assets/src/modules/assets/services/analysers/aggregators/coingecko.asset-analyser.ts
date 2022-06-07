/* eslint-disable camelcase */
import { CoinGeckoClient } from 'coingecko-api-v3';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CoingeckoPlatformEnum } from '@app/common';

import { AssetReference } from '../../../../../common/types';

import { AssetCategory } from '../../../enums/asset-category.enum';
import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';

const STABLECOIN_CATEGORIES = ['Stablecoins', 'USD Stablecoin'];

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
    const coingeckoChainId = CoingeckoPlatformEnum[ChainIdEnum[chainId]];
    const coingeckoAsset = await this.coinGeckoClient.contract({
      id: coingeckoChainId as any,
      contract_address: address,
    });

    if (!coingeckoAsset || !coingeckoAsset.id) {
      return;
    }

    const {
      id,
      image,
      market_cap_rank,
      coingecko_rank,
      symbol,
      name,
      categories = [],
    } = coingeckoAsset;

    const isStableCoin = categories?.some((category) => STABLECOIN_CATEGORIES.includes(category));

    return {
      name,
      symbol,
      isTracked: true,
      categories: isStableCoin ? [AssetCategory.Stablecoin] : [],
      icons: Object.entries(image).map(([key, value]) => ({
        source: 'coingecko',
        label: key,
        url: value,
      })),
      metadata: {
        coingeckoId: id,
        marketCapRank: market_cap_rank,
        coingeckoRank: coingecko_rank,
      },
    };
  }
}
