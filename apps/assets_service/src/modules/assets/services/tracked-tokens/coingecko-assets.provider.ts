/* eslint-disable camelcase */
import { CoinGeckoClient } from 'coingecko-api-v3';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainService } from '../../../../common/services/chain.service';

import { TrackedAssetCandidate, TrackedAssetsProvider } from './tracked-assets.provider';

@Injectable()
export class CoingeckoAssetsProvider implements TrackedAssetsProvider {
  private readonly coinGeckoClient = new CoinGeckoClient({
    timeout: 10000,
    autoRetry: true,
  });

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly chainService: ChainService,
  ) {}

  name() {
    return 'CoinGecko';
  }

  async getTrackedAssetsCandidates(): Promise<TrackedAssetCandidate[]> {
    const chainIdMap = await this.getCoingeckoChainMap();
    const coingeckoCoins = await this.coinGeckoClient.coinList({ include_platform: true });

    const candidates: TrackedAssetCandidate[] = [];

    for (const { platforms } of coingeckoCoins) {
      for (const [chain, address] of Object.entries(platforms)) {
        const chainId = chainIdMap.get(chain);
        if (chainId && address) {
          candidates.push({ chainId, address });
        }
      }
    }

    return candidates;
  }

  private async getCoingeckoChainMap() {
    const chains = await this.chainService.getChains();
    return new Map<string, number>(
      chains
        .filter(({ metadata }) => metadata?.coingeckoPlatformId)
        .map(({ id, metadata }) => [metadata.coingeckoPlatformId, id]),
    );
  }
}
