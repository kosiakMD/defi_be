import { doWhilst } from 'async';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';

import { AssetProcessingRequest } from '../../types/asset-processing.request';
import { TrackedAssetsProvider } from './tracked-assets.provider';

type SolanaToken = {
  mintAddress: string;
};

@Injectable()
export class SolscanAssetsProvider implements TrackedAssetsProvider {
  private readonly apiUrl = 'https://public-api.solscan.io/token/list';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {}

  name() {
    return 'SolscanAssetsProvider';
  }

  async getTrackedAssetsCandidates(): Promise<AssetProcessingRequest[]> {
    const limit = 500;
    const maxItems = 500;

    let assetProcessingRequests: AssetProcessingRequest[] = [];
    let offset = 0;
    await doWhilst(
      async () => this.getChunk(offset, limit),
      async (chunk) => {
        assetProcessingRequests = assetProcessingRequests.concat(chunk);
        offset += chunk.length;
        return offset < maxItems && chunk.length;
      },
    );
    return assetProcessingRequests;
  }

  private async getChunk(offset: number, limit: number, sortBy = 'volume', direction = 'desc') {
    const {
      data: { data: assets },
    } = await firstValueFrom(
      this.httpService.get<{ data: SolanaToken[] }>(this.apiUrl, {
        params: {
          sortBy,
          direction,
          limit,
          offset,
        },
      }),
    );

    return assets.map((token) => ({
      address: token.mintAddress,
      chainId: ChainIdEnum.sol,
    }));
  }
}
