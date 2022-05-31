import { Cache, CachingConfig, StoreConfig } from 'cache-manager';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  public async getOrLoad<T = any>(
    key: string,
    load: () => T | Promise<T>,
    options?: CachingConfig,
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const loaded = await load();
    if (loaded !== undefined && loaded !== null) {
      await this.cache.set(key, loaded, options);
    }

    return loaded;
  }

  public get<T = any>(key: string): Promise<T> {
    return this.cache.get<T>(key);
  }

  public async mget<T = any>(keys: string[]): Promise<T[]> {
    if (!keys.length) {
      return [];
    }

    const response = await this.cache.store.mget(...keys);
    return response as T[];
  }

  public async set<T = any>(key: string, value: T, options?: CachingConfig): Promise<T> {
    return this.cache.set(key, value, options);
  }

  public async mset<T = any>(
    values: { key: string; value: T }[],
    options: Partial<StoreConfig> = {},
  ): Promise<void> {
    if (!values.length) {
      return;
    }

    const cacheArray = values.reduce((arr, curr) => arr.concat([curr.key, curr.value]), []);
    await this.cache.store.mset(...cacheArray, options);
  }
}
