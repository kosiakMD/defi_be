import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { Univ2NetworkPriceProviderConfig } from '../../../../common/types';

import { PriceSourceStrategy } from '../../../prices/enums/price-source-strategy.enum';
import { PriceSourceRepository } from '../../../prices/repositories/price-source.repository';
import { AssetProcessingRequest } from '../../types/asset-processing.request';
import { TrackedAssetsProvider } from './tracked-assets.provider';

/*
 Assets that are used for price calculation but UniV2 network strategy should be marked as tracked
 * */
@Injectable()
export class PriceStrategyAssetsProvider implements TrackedAssetsProvider {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(PriceSourceRepository)
    private readonly priceSourceRepository: PriceSourceRepository,
  ) {}

  name(): string {
    return 'Price Strategy Used';
  }

  async getTrackedAssetsCandidates(): Promise<AssetProcessingRequest[]> {
    const priceSources = await this.priceSourceRepository.getPriceSourcesByType(
      PriceSourceStrategy.UNIV2_NETWORK,
    );
    this.logger.log(`${priceSources.length} UniSwap V2 sources found`);

    const assets = new Array<AssetProcessingRequest>();

    for (const source of priceSources) {
      const config = source.config as Univ2NetworkPriceProviderConfig;
      const priceSourceAssets = [
        config.wrappedCoin,
        ...config.stableCoins,
        ...(config.proxyCoins || []),
      ];

      assets.push(...priceSourceAssets.map((address) => ({ address, chainId: config.chainId })));
    }

    return assets;
  }
}
