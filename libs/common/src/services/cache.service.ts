import { Cache, CachingConfig } from 'cache-manager';

import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  public async getOrLoad<T = any>(
    key: string,
    load: () => T | Promise<T>,
    options?: CachingConfig,
  ): Promise<T> {
    const cached = await this.cacheManager.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const loaded = await load();
    await this.cacheManager.set(key, loaded, options);

    return loaded;
  }
}
