import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';

import { AssetReference } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';

@Injectable()
export class CardanoRegistryAssetAnalyser implements AssetAnalyser {
  readonly baseUrl = 'https://tokens.cardano.org/metadata/';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {}

  canAnalyseAsset({ chainId }: AssetReference): boolean {
    return chainId === ChainIdEnum.cardano;
  }

  async analyseAsset({ address }: AssetReference): Promise<AssetAnalysisResult> {
    try {
      const { data } = await firstValueFrom(this.httpService.get(`${this.baseUrl}${address}`));
      if (!data) {
        return null;
      }
      return {
        symbol: data.ticker.value,
        name: data.name.value,
        decimals: data.decimals?.value || 0,
      };
    } catch (e) {
      this.logger.error(`analyseAsset error: ${e.message}`, e.stack);
    }
  }
}
