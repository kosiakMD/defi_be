import { Cache } from 'cache-manager';
import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotifyPayloadFeaturesDto } from "./notifyPayloadFeatures.dto";

@Injectable()
export class JobsService {
  cacheTTLInSeconds: number;

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.cacheTTLInSeconds = config.get<number>('POOLS_CACHE_TTL_IN_SECONDS') || 5 * 60;
  }

  async saveFeatureToCache(features: NotifyPayloadFeaturesDto[]): Promise<{ success: boolean, count: number }> {
    const done = await Promise.all(features.map(feature => this.updateCacheFeature(feature)))
    return { success: true, count: done.length }
  }

  private updateCacheFeature(features: NotifyPayloadFeaturesDto): Promise<NotifyPayloadFeaturesDto> {
    return this.cache.set(this.getCacheKey(features), features, { ttl: this.cacheTTLInSeconds });
  }

  private getCacheKey(features: NotifyPayloadFeaturesDto): string {
    return `${features.chain}_${features.protocolName}_${features.featureName}`;
  }
}
