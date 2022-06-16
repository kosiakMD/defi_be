import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { formatError } from '@app/common/utils';

import { AssetProcessingRequest } from '../../types/asset-processing.request';
import { CosmosHelper } from '../helpers/cosmos.helper';
import { TrackedAssetsProvider } from './tracked-assets.provider';

@Injectable()
export class PolkachuCosmosAssetsProvider implements TrackedAssetsProvider {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly config: ConfigService,
    protected readonly httpService: HttpService,
    protected readonly cosmosHelper: CosmosHelper,
  ) {}

  name() {
    return 'PolkachuCosmosAssetsProvider';
  }

  async getTrackedAssetsCandidates(): Promise<AssetProcessingRequest[]> {
    const allResults = await Promise.allSettled(
      Array.from(this.cosmosHelper.chainUrlMap.entries()).map(([chainId, url]) =>
        this.getTrackedAssetsCandidatesForChain(chainId, url),
      ),
    );
    return handlePromiseAllSettled(allResults)[0].flat();
  }

  private async getTrackedAssetsCandidatesForChain(chainId: number, url: string) {
    try {
      const { data } = await firstValueFrom(this.httpService.get(`${url}`));
      const addresses: string[] = [];
      for (const denom of data.denom_traces) {
        if (!denom.path.startsWith('pool')) {
          addresses.push(this.cosmosHelper.transformDenomToHash(denom));
        }
      }

      return addresses.map<AssetProcessingRequest>((address) => ({
        chainId,
        address,
      }));
    } catch (e) {
      this.logger.error(`getTrackedAssetsCandidates error: [${e.message}]`, {
        chainId,
        url,
        error: formatError(e),
      });
      throw e;
    }
  }
}
