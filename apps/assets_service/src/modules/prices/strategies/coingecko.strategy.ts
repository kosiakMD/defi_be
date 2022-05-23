/* eslint-disable camelcase */
import { CoinGeckoClient } from 'coingecko-api-v3';

import { Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { delay } from '@app/common/helpers/delay';
import { chunkRunAsync } from '@app/common/utils';

import { ChainService } from '../../../common/services/chain.service';
import { Chain } from '../../../common/types/chain.type';

import { AssetEntity } from '../../assets/entities/asset.entity';
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
    private readonly chainService: ChainService,
    @InjectRepository(AssetsRepository) private readonly assetsRepository: AssetsRepository,
  ) {
    super();
  }

  public async fetchPrices(priceSource: PriceSource<Config>): Promise<AssetPrice[]> {
    const chains = await this.chainService.getChains();
    const assets = await this.assetsRepository.getAllTrackedAssets();

    let prices: AssetPrice[] = [];

    for (const chain of chains) {
      const chainPrices = await this.fetchChainPrices(chain, assets, priceSource);
      prices = prices.concat(chainPrices);
    }

    return prices;
  }

  private async fetchChainPrices(
    chain: Chain,
    assets: AssetEntity[],
    { sourceId, config }: PriceSource<Config>,
  ) {
    const coingekoId = chain.metadata?.coingeckoPlatformId;
    if (!coingekoId) {
      this.logger.warn(`No Coingecko mapping for chain id: ${chain.id}`);
      return [];
    }

    const chainAssets = assets.filter(({ chainId }) => chain.id === chainId);

    const chunkSize = config?.chunkSize || 100;
    const responses = await chunkRunAsync(chainAssets, chunkSize, (chunkAssets) =>
      this.fetchChainChunkPrices(sourceId, coingekoId, chunkAssets, config),
    );

    return responses.flat();
  }

  private async fetchChainChunkPrices(
    sourceId: number,
    coingekoId: string,
    chunkAssets: AssetEntity[],
    config: Config,
  ) {
    const addresses = chunkAssets.map(({ address }) => address);
    await delay(config?.requestDelay || 0);
    const coins = await this.coinGeckoClient.simpleTokenPrice({
      id: coingekoId as any,
      contract_addresses: addresses.join(','),
      vs_currencies: 'usd',
    });
    return chunkAssets.map<AssetPrice>(({ chainId, address }) => ({
      chainId,
      address,
      sourceId,
      price: coins[address]?.usd,
    }));
  }
}
