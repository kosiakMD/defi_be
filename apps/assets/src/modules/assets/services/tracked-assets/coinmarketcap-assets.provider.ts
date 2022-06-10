import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';

import { ChainService } from '../../../../common/services/chain.service';

import { AssetProcessingRequest } from '../../types/asset-processing.request';
import { TrackedAssetsProvider } from './tracked-assets.provider';

@Injectable()
export class CoinmarketcapAssetsProvider implements TrackedAssetsProvider {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
    private readonly chainService: ChainService,
  ) {}

  name() {
    return 'CoinMarketCap';
  }

  async getTrackedAssetsCandidates(): Promise<AssetProcessingRequest[]> {
    const chainIdMap = await this.getCoinmarketcapChainMap();
    const batchSize = this.config.get<number>('COINMARKETCAP_GET_TOKENS_LIMIT'); //1000 by default
    const maxTokens = this.config.get<number>('COINMARKETCAP_TOKEN_LIST_LIMIT'); //15000 by default

    const candidates: AssetProcessingRequest[] = [];

    for (let start = 1; start < maxTokens; start += batchSize) {
      this.logger.debug(`Coinmarketcap batch tokens loading [${start}, ${batchSize}]`);
      const batchTokens = await this.getBatchTokens(chainIdMap, start, batchSize);
      this.logger.debug(`Coinmarketcap batch tokens loaded ${batchTokens.length}`);
      candidates.push(...batchTokens);
    }

    return candidates;
  }

  private async getBatchTokens(chainIdMap: Map<string, number>, start: number, batchSize: number) {
    const candidates: AssetProcessingRequest[] = [];

    const coinmarketcapTokens = await this.getCoinmarketcapTokens(start, batchSize);
    for (const { id, platform, rank } of coinmarketcapTokens) {
      const { name: chain, token_address: address } = platform || {};
      const chainId = chainIdMap.get(chain);
      if (chainId && chainId !== ChainIdEnum.cardano && address) {
        candidates.push({
          chainId,
          address,
          metadata: { coinmarketcapId: id.toString(), marketCapRank: rank },
        });
      }
    }

    return candidates;
  }

  private async getCoinmarketcapTokens(start: number, take: number) {
    const {
      data: { data },
    } = await firstValueFrom(
      this.httpService.get<CoinmarketcapResponse>(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map',
        {
          headers: {
            'X-CMC_PRO_API_KEY': this.config.get('COINMARKETCAP_API_KEY'),
          },
          params: {
            limit: take,
            start,
            sort: 'cmc_rank',
          },
        },
      ),
    );

    return data;
  }

  private async getCoinmarketcapChainMap() {
    const chains = await this.chainService.getChains();
    return new Map<string, number>(
      chains
        .filter(({ metadata }) => metadata?.coinmarketcapPlatformName)
        .map(({ id, metadata }) => [metadata.coinmarketcapPlatformName, id]),
    );
  }
}

type CoinmarketcapResponse = {
  data: CoinmarketcapToken[];
};

type CoinmarketcapToken = {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  rank: number;
  is_active: number;
  first_historical_data: string;
  last_historical_data: string;
  platform: CoinmarketcapPlatform;
};

type CoinmarketcapPlatform = { [key: string]: string };
