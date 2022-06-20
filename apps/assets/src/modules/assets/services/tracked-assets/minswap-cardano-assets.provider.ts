import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { gql } from '@app/common/utils';

import { AssetProcessingRequest } from '../../types/asset-processing.request';
import { TrackedAssetsProvider } from './tracked-assets.provider';

@Injectable()
export class MinSwapCardanoAssetsProvider implements TrackedAssetsProvider {
  private MinSwapEndpoint = 'https://monorepo-mainnet-prod.minswap.org/graphql?TopPools';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly config: ConfigService,
    protected readonly httpService: HttpService,
  ) {}

  name() {
    return 'MinSwapCardano';
  }

  async getTrackedAssetsCandidates(): Promise<AssetProcessingRequest[]> {
    const poolLength = 340;
    const limit = 20;
    const requests = [];
    for (let offset = 0; offset < poolLength; offset += limit) {
      requests.push(
        firstValueFrom(
          this.httpService
            .post(this.MinSwapEndpoint, {
              query: this.gqlQuery,
              variables: { limit, offset },
            })
            .pipe(map((r) => r.data?.data?.topPools)),
        ),
      );
    }
    const response = await Promise.allSettled(requests);
    const [data] = handlePromiseAllSettled(response);

    return data.flat().map(({ lpAsset }) => ({
      chainId: ChainIdEnum.cardano,
      address: lpAsset.currencySymbol + '.' + lpAsset.tokenName,
    }));
  }

  private get gqlQuery(): string {
    return gql`
      query TopPools($asset: String, $offset: Int, $limit: Int) {
        topPools(asset: $asset, offset: $offset, limit: $limit) {
          lpAsset {
            currencySymbol
            tokenName
          }
        }
      }
    `;
  }
}
