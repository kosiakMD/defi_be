import { Chain } from 'apps/assets_service/src/common/types/chain.type';
import * as debank from 'debank-open-api';

import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { delay } from '@app/common/helpers/delay';
import { chunkRunAsync } from '@app/common/utils';

import { ChainService } from '../../../common/services/chain.service';

import { AssetEntity } from '../../assets/entities/asset.entity';
import { AssetsRepository } from '../../assets/repositories/assets.repository';
import { AssetPrice } from '../types/asset-price.type';
import { PriceSource } from '../types/price-source.type';
import { BaseStrategy } from './base.strategy';

type Config = {
  chunkSize?: number;
  requestDelay?: number;
};

export class DebankStrategy extends BaseStrategy<Config> {
  private readonly api: debank.TokenApi;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly chainService: ChainService,
    @InjectRepository(AssetsRepository) private readonly assetsRepository: AssetsRepository,
  ) {
    super();
    this.api = new debank.TokenApi({ apiKey: config.get('DEBANK_API_ACCESS_KEY') });
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
    const debankId = chain.metadata?.debankPlatformId;
    if (!debankId) {
      this.logger.warn(`No Debank mapping for chain id: ${chain.id}`);
      return [];
    }

    const chainAssets = assets.filter(({ chainId }) => chain.id === chainId);

    const chunkSize = config?.chunkSize || 100;
    const responses = await chunkRunAsync(chainAssets, chunkSize, (chunkAssets) =>
      this.fetchChainChunkPrices(sourceId, chain.id, debankId, chunkAssets, config),
    );

    return responses.flat();
  }

  private async fetchChainChunkPrices(
    sourceId: number,
    chainId: number,
    debankId: string,
    chunkAssets: AssetEntity[],
    config: Config,
  ) {
    const addresses = chunkAssets.map(({ address }) => address);
    await delay(config?.requestDelay || 0);
    const { data: debankAssets } = await this.api.getTokenListByIdsR(debankId, addresses);
    return debankAssets.map<AssetPrice>(({ id, price }) => ({
      chainId,
      address: id,
      sourceId,
      price,
    }));
  }
}
