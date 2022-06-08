import { createHash } from 'crypto';

import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AssetProcessingRequest } from '../../types/asset-processing.request';
import { TrackedAssetsProvider } from './tracked-assets.provider';

export abstract class CosmosHubTokenRegistryProvider implements TrackedAssetsProvider {
  protected readonly baseUrl: string;
  protected readonly config: ConfigService;
  protected readonly httpService: HttpService;
  protected readonly logger: Logger;

  abstract name(): string;
  abstract getTrackedAssetsCandidates(): Promise<AssetProcessingRequest[]>;

  protected transformDenomToHash({ path, baseDenom }: { path: string; baseDenom: string }): string {
    const msgBuffer = new TextEncoder().encode(path + '/' + baseDenom);
    const hashBuffer = createHash('sha256') //
      .update(msgBuffer)
      .digest();
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return 'ibc/' + hashHex.toUpperCase();
  }
}
