import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { AssetReference } from '../../../../../common/types';

import { AssetAnalysisResult } from '../core/asset.analyser';
import { CardanoBaseAssetAnalyser } from '../core/cardano-base.asset-analyser';

type TokenMetadata = {
  ticker?: {
    value: string;
  };
  name?: {
    value: string;
  };
  decimals?: {
    value: number;
  };
};

@Injectable()
export class CardanoRegistryAssetAnalyser extends CardanoBaseAssetAnalyser {
  readonly baseUrl = 'https://tokens.cardano.org/metadata/';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async analyseAsset({ address }: AssetReference): Promise<AssetAnalysisResult> {
    const { data } = await firstValueFrom(
      this.httpService.get<TokenMetadata>(`${this.baseUrl}${address.replace('.', '')}`),
    );
    if (!data?.ticker || !data?.name) {
      return null;
    }
    return {
      symbol: data.ticker.value,
      name: data.name.value,
      decimals: data.decimals?.value || 0,
    };
  }
}
