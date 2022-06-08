import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';

import { AssetProcessingRequest } from '../../types/asset-processing.request';
import { CosmosHubTokenRegistryProvider } from './cosmos-hub-token-registry.provider';
import { TrackedAssetsProvider } from './tracked-assets.provider';

@Injectable()
export class OsmosisTokenRegistryProvider
  extends CosmosHubTokenRegistryProvider
  implements TrackedAssetsProvider
{
  readonly baseUrl =
    'https://osmosis-api.polkachu.com/ibc/apps/transfer/v1/denom_traces?pagination.limit=1000';
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly config: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    super();
  }

  name() {
    return 'OsmosisIBC';
  }

  async getTrackedAssetsCandidates(): Promise<AssetProcessingRequest[]> {
    const { data } = await firstValueFrom(this.httpService.get(`${this.baseUrl}`));
    const addresses: string[] = [];
    for (const denom of data.denom_traces) {
      if (denom.path.startsWith('pool')) continue;

      addresses.push(this.transformDenomToHash(denom));
    }

    return addresses.map<AssetProcessingRequest>((address) => ({
      chainId: ChainIdEnum.osmosis,
      address: address,
    }));
  }
}
