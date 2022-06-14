import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { AssetReference } from '../../../../../common/types';

import { AssetAnalysisResult } from '../core/asset.analyser';
import { SolanaBaseAssetAnalyser } from '../core/solana-base.asset-analyser';

// TODO: Review this strategy and use chain not API
@Injectable()
export class SolanaAssetAnalyser extends SolanaBaseAssetAnalyser {
  constructor(private readonly http: HttpService) {
    super();
  }

  async analyseAsset({ address }: AssetReference): Promise<AssetAnalysisResult> {
    const { data: asset } = await firstValueFrom(
      this.http.get(`https://public-api.solanabeach.io/v1/account/${address}`),
    );

    // TODO: Add typings
    if (!asset?.value) {
      return null;
    }

    const { base, extended } = asset.value;
    return {
      name: base.address.name,
      symbol: base.address.ticker,
      decimals: extended.decimals,
    };
  }
}
