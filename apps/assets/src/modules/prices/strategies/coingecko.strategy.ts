/* eslint-disable camelcase */
import { CoinGeckoClient } from 'coingecko-api-v3';

import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { delay } from '@app/common/helpers/delay';
import { CacheService } from '@app/common/services/cache.service';
import { chunkRunAsync } from '@app/common/utils';

import { AssetsRepository } from '../../assets/repositories/assets.repository';
import { AssetPrice } from '../types/asset-price.type';
import { PriceSource } from '../types/price-source.type';
import { BaseStrategy } from './base.strategy';

type Config = {
  chunkSize?: number;
  requestDelay?: number;
};

export class CoingeckoStrategy extends BaseStrategy<Config> {
  private readonly coinGeckoClient = new CoinGeckoClient({
    timeout: 10000,
    autoRetry: true,
  });

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly cacheService: CacheService,
    @InjectRepository(AssetsRepository) private readonly assetsRepository: AssetsRepository,
  ) {
    super();
  }

  public async fetchPrices({ sourceId, config }: PriceSource<Config>): Promise<AssetPrice[]> {
    const assets = await this.getCoingekoAssetsList();
    const uniqueCoinIds = assets.reduce(
      (list, { coingeckoId }) => (list.includes(coingeckoId) ? list : list.concat([coingeckoId])),
      new Array<string>(),
    );

    const maxChunkSize = 500;
    const chunkSize = config?.chunkSize ? Math.min(config?.chunkSize, maxChunkSize) : maxChunkSize;
    this.logger.log(
      `${uniqueCoinIds.length} unique coingecko coins loaded. Chunk size: ${chunkSize}`,
    );

    const coinPrices = await chunkRunAsync(uniqueCoinIds, chunkSize, async (chunkIds, index) => {
      try {
        await delay(config?.requestDelay || 0);
        this.logger.log(`Loading coingecko prices for chunk: ${index}`);
        return this.fetchCoinsPrices(chunkIds);
      } catch (e) {
        this.logger.error(`Failed to load coingeko prices for chunk: ${index}`, e);
        return [];
      }
    });

    const priceMapping = new Map<string, number>(
      coinPrices.map(({ coinId, price }) => [coinId, price]),
    );

    return assets.map(({ chainId, address, coingeckoId }) => ({
      sourceId,
      chainId,
      address,
      price: priceMapping.get(coingeckoId),
    }));
  }

  private getCoingekoAssetsList() {
    return this.cacheService.getOrLoad(
      'coingecko_assets_list',
      async () => {
        const assets = await this.assetsRepository.findCoingeckoAssets();
        return assets.map(({ chainId, address, metadata: { coingeckoId } }) => ({
          chainId,
          address,
          coingeckoId,
        }));
      },
      {
        ttl: 60 * 60,
      },
    );
  }

  private async fetchCoinsPrices(coinIds: string[]) {
    const coins = await this.coinGeckoClient.simplePrice({
      ids: coinIds.join(','),
      vs_currencies: 'usd',
    });
    return coinIds.map((id) => ({
      coinId: id,
      price: coins[id]?.usd,
    }));
  }
}
