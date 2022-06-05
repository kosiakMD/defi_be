import { Cache, CachingConfig, StoreConfig } from 'cache-manager';

import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  public async getOrLoad<T = any>(
    key: string,
    load: () => T | Promise<T>,
    options?: CachingConfig,
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const loaded = await load();
    if (loaded !== undefined) {
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
    const validValues = values.filter(({ value }) => value !== undefined);
    if (!validValues.length) {
      return;
    }

    const cacheArray = validValues.reduce((arr, curr) => arr.concat([curr.key, curr.value]), []);
    await this.cache.store.mset(...cacheArray, options);
  }
}
