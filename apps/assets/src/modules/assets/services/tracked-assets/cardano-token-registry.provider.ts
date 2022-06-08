import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';

import { AssetProcessingRequest } from '../../types/asset-processing.request';
import { GithubService } from './helpers/github.helper';
import { TrackedAssetsProvider } from './tracked-assets.provider';

@Injectable()
export class CardanoTokenRegistryProvider implements TrackedAssetsProvider {
  private readonly githubOwner = 'cardano-foundation';
  private readonly githubRepo = 'cardano-token-registry';
  private readonly githubTreeSha = 'e9b48dd0b1f9256763ed0690ca082aaa46ac88dd';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
    private readonly githubService: GithubService,
  ) {}

  name() {
    return 'CardanoTokenRegistry';
  }

  async getTrackedAssetsCandidates(): Promise<AssetProcessingRequest[]> {
    const addresses = await this.githubService.getFileNames(
      this.githubOwner,
      this.githubRepo,
      this.githubTreeSha,
    );
    return addresses.map<AssetProcessingRequest>((address) => ({
      chainId: ChainIdEnum.cardano,
      address: address.replace('.json', ''),
    }));
  }
}
