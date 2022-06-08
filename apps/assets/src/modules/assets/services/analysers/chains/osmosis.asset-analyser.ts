import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';

import { AssetReference } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';

@Injectable()
export class OsmosisAssetAnalyser implements AssetAnalyser {
  readonly baseUrl = 'https://osmosis-api.polkachu.com/ibc/apps/transfer/v1/denom_traces/';
  // private readonly githubOwner = 'osmosis-labs';
  // private readonly githubRepo = 'osmosis-frontend';
  // private readonly githubFileTree = 'packages/web/config/chain-infos.ts';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService, // private readonly githubService: GithubService,
  ) {}

  name() {
    return 'osmosis';
  }

  canAnalyseAsset({ chainId }: AssetReference): boolean {
    return chainId === ChainIdEnum.osmosis;
  }

  async analyseAsset({ address }: AssetReference): Promise<AssetAnalysisResult> {
    try {
      const [, hash] = address.split('/');
      const { data } = await firstValueFrom(this.httpService.get(`${this.baseUrl}${hash}`));
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
