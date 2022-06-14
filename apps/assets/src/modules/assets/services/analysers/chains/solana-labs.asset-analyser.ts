import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { SolanaChains } from '@app/common/constant/solana.chains';
import { CacheService } from '@app/common/services/cache.service';

import { AssetReference } from '../../../../../common/types';

import { AssetAnalysisResult } from '../core/asset.analyser';
import { SolanaBaseAssetAnalyser } from '../core/solana-base.asset-analyser';

type TokenList = [
  {
    address: string;
    chainId: number;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    extensions?: {
      coingeckoId: string;
    };
  },
];

@Injectable()
export class SolanaLabsAssetAnalyzer extends SolanaBaseAssetAnalyser {
  private readonly url =
    'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json';

  constructor(private readonly httpService: HttpService, private readonly cache: CacheService) {
    super();
  }

  async analyseAsset({ address }: AssetReference): Promise<AssetAnalysisResult> {
    const tokens = await this.getTokenList();
    const token = tokens.find((t) => t.address === address);
    if (!token) {
      return null;
    }
    return {
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      icons: [
        {
          url: token.logoURI,
          source: 'solana-labs',
        },
      ],
      metadata: {
        coingeckoId: token?.extensions?.coingeckoId,
      },
    };
  }

  private async getTokenList(): Promise<TokenList> {
    return this.cache.getOrLoad(
      this.url,
      async () => {
        const { data } = await firstValueFrom(this.httpService.get(`${this.url}`));
        return data.tokens.filter(({ chainId }) => chainId === SolanaChains.MainnetBeta);
      },
      { ttl: 60 * 60 /* 1 hour in seconds */ },
    );
  }
}
