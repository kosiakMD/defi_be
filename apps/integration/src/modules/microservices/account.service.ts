import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { IAssetResponseDto } from '@app/common';
import { DetailedResponseDto } from '@app/common/dto';
import { ChainIdEnum } from '@app/common/enum';
import { Address, BalancesResponse } from '@app/common/types';
import { chunk } from '@app/common/utils';

import { Asset } from '../../common/interfaces/transactions.interfaces';

import { AccountServiceInterface } from './account.service.interface';
import { logExecutionTime } from './utils';

@Injectable()
export class AccountService implements AccountServiceInterface {
  protected readonly cacheTTLInSeconds: number;

  protected getBalanceUrl: string;
  protected getAssetsUrl: string;
  protected saveAssetsUrl: string;
  protected saveAssetsUnderlyingUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
    protected httpService: HttpService,
    protected configService: ConfigService,
    @Inject(CACHE_MANAGER) protected readonly cache: Cache,
  ) {
    this.cacheTTLInSeconds =
      this.configService.get<number>('BLACKLISTED_CACHE_TTL_IN_SECONDS') || 300;

    const url = this.configService.get<string>('ACCOUNT_SERVICE_URL');

    this.getBalanceUrl = `${url}/v1/balances`;
    this.getAssetsUrl = `${url}/v1/assets`;
    this.saveAssetsUrl = `${url}/v1/assets/save`;
    this.saveAssetsUnderlyingUrl = `${url}/v1/assets/save-underlying`;
  }

  async getBalances(
    addresses: Address[],
    chains?: ChainIdEnum[],
    assets?: Address[],
  ): Promise<BalancesResponse> {
    const { data } = await logExecutionTime(
      this.logger,
      `Get Balances for ${addresses.length} addressed, ${assets.length} assets, ${chains.length} chain`,
      () =>
        firstValueFrom(
          this.httpService.get(this.getBalanceUrl, { params: { addresses, chains, assets } }),
        ),
    );

    return data;
  }

  async getBalancesPost(
    addresses: Address[],
    chains?: ChainIdEnum[],
    assets?: Address[],
  ): Promise<BalancesResponse> {
    const { data } = await logExecutionTime(
      this.logger,
      `Get (POST) Balances for ${addresses.length} addressed, ${assets.length} assets, ${chains.length} chain`,
      () =>
        firstValueFrom(this.httpService.post(this.getBalanceUrl, { addresses, chains, assets })),
    );

    return data;
  }

  async getAssets(
    addresses: Address[],
    chainIds?: ChainIdEnum[],
  ): Promise<DetailedResponseDto<Asset[]>> {
    const cacheKey = `getAssets_${addresses.join(',')}_${chainIds.join(',')}`;

    return this.getOrSet(this.cacheTTLInSeconds, cacheKey, async () => {
      const dataArray = await Promise.all(
        // TODO: move max chunk size into env or constants
        chunk(addresses, 250).map(async (addressChunk) => {
          const { data } = await logExecutionTime(
            this.logger,
            `Get Assets for ${addressChunk.length} assets, ${chainIds.length} chain`,
            () =>
              firstValueFrom(
                this.httpService.get(this.getAssetsUrl, {
                  params: { addresses: addressChunk, chains: chainIds },
                }),
              ),
          );

          return data;
        }),
      );

      return dataArray.reduce((acc, cur) => {
        acc.data.push(...cur.data);
        return acc;
      });
    });
  }

  // @RequestErrorHandler()
  async getTrackedAssets(address: Address, chainId?: ChainIdEnum): Promise<IAssetResponseDto> {
    const cacheKey = `getTrackedAssets_${address}_${chainId}`;

    const cachedResult: IAssetResponseDto = await this.cache.get(cacheKey);

    if (cachedResult) {
      return cachedResult;
    } else {
      const { data } = await logExecutionTime(
        this.logger,
        `Get Tracked Asset ${address} chain ${chainId}`,
        () => firstValueFrom(this.httpService.post(this.getAssetsUrl, { address, chain: chainId })),
      );

      await this.cache.set(cacheKey, data, { ttl: this.cacheTTLInSeconds });

      return data;
    }
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
  protected async getOrSet<T>(ttl: number, key: string, callback: () => Promise<T>): Promise<T> {
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
