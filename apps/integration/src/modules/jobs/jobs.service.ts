import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NotifyPayloadFeaturesDto } from '../../common/dto';

import { SavePoolsResponseDto } from './dto/save.pools.response.dto';

@Injectable()
export class JobsService {
  cacheTTLInSeconds: number;

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.cacheTTLInSeconds = config.get<number>('JOBS_CACHE_TTL_IN_SECONDS') || 60 * 60 * 24; // 24 hours
  }

  async saveFeatureToCache(features: NotifyPayloadFeaturesDto[]): Promise<SavePoolsResponseDto> {
    const done = await Promise.all(features.map((feature) => this.updateCacheFeature(feature)));
    return { success: true, count: done.length };
  }

  private async updateCacheFeature(
    features: NotifyPayloadFeaturesDto,
  ): Promise<NotifyPayloadFeaturesDto> {
    return await this.cache.set(JobsService.getCacheKey(features), features, {
      ttl: this.cacheTTLInSeconds,
    });
  }

  private static getCacheKey(features: NotifyPayloadFeaturesDto): string {
    return `${features.chain}_${features.protocolName}_${features.featureName}`;
  }
}
