import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from '@app/common/types';

@Injectable()
export class AssetsService {
  private readonly cacheTTLInSeconds: number;
  private baseURL: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.cacheTTLInSeconds =
      this.configService.get<number>('BLACKLISTED_CACHE_TTL_IN_SECONDS') || 300;

    this.baseURL = this.configService.get<string>('ASSETS_SERVICE_URL');
  }

  public getAsset(chainId: number, address: Address): Promise<void> {
    const cacheKey = `asset_${address}::${chainId}`;
    return this.getOrSet(this.cacheTTLInSeconds, cacheKey, async () => {
      const $data = this.httpService.get(this.assetURI, {
        params: {
          chainId,
          address,
        },
      });

      const { data } = await firstValueFrom($data);
      return data;
    });
  }

  public getAssetsBulk(assets: Array<{ address: string; chainId: number }>): Promise<any[]> {
    const cacheKey =
      'bulkAssets_' + assets.map(({ address, chainId }) => `${address}::${chainId}`).join(',');

    return this.getOrSet(this.cacheTTLInSeconds, cacheKey, async () => {
      const $data = this.httpService.post(this.assetBulkURI, { assets });

      const { data } = await firstValueFrom($data);
      return data.assets;
    });
  }

  private get assetURI(): string {
    return new URL('/v1/assets', this.baseURL).toString();
  }

  private get assetBulkURI(): string {
    return new URL('/v1/assets/get-bulk', this.baseURL).toString();
  }

  /**
   * retrieves from cache if available. If not available, executes the callback
   * & saves to cache for next time
   *
   * @param ttl time to live
   * @param key cache key
   * @param callback data to cache
   * @returns data
   */
  private async getOrSet<T>(ttl: number, key: string, callback: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached) return cached;

    // in the event of an error, nothing will be cached
    const data = await callback();
    if (data) {
      await this.cache.set(key, data, { ttl });
    }
    return data;
  }
}
