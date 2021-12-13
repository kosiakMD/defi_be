import { Cache } from 'cache-manager';

import { CACHE_MANAGER, HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IAssetResponseDto } from '@app/common';
import { DetailedResponseDto } from '@app/common/dto';
import { ChainIdEnum } from '@app/common/enum';
import { Address, BalancesResponse } from '@app/common/types';

import { Asset } from '../../common/interfaces/transactions.interfaces';

@Injectable()
export class AccountService {
  private readonly cacheTTLInSeconds: number;

  private getBalanceUrl: string;
  private getAssetsUrl: string;
  private getBalanceCovalentUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.cacheTTLInSeconds =
      this.configService.get<number>('BLACKLISTED_CACHE_TTL_IN_SECONDS') || 300;

    const url = this.configService.get<string>('ACCOUNT_SERVICE_URL');

    this.getBalanceUrl = `${url}/v1/balances`;
    this.getAssetsUrl = `${url}/v1/assets`;
  }

  async getBalances(
    addresses: Address[],
    chains?: ChainIdEnum[],
    assets?: Address[],
  ): Promise<BalancesResponse> {
    const data = await this.httpService
      .get(this.getBalanceUrl, { params: { addresses, chains, assets } })
      .toPromise();
    return data.data;
  }

  async getBalancesPost(
    addresses: Address[],
    chains?: ChainIdEnum[],
    assets?: Address[],
  ): Promise<BalancesResponse> {
    const data = await this.httpService
      .post(this.getBalanceUrl, { addresses, chains, assets })
      .toPromise();
    return data.data;
  }

  async getAssets(
    addresses: Address[],
    chainIds?: ChainIdEnum[],
  ): Promise<DetailedResponseDto<Asset[]>> {
    const cacheKey = `${addresses.join(',')}_${chainIds.join(',')}`;

    const cachedResult: DetailedResponseDto<Asset[]> = await this.cache.get(cacheKey);

    if (cachedResult) {
      return cachedResult;
    } else {
      const data = await this.httpService
        .get(this.getAssetsUrl, { params: { addresses, chains: chainIds } })
        .toPromise();

      await this.cache.set(cacheKey, data.data, { ttl: this.cacheTTLInSeconds });

      return data.data;
    }
  }

  // @RequestErrorHandler()
  async getTrackedAssets(address: Address, chainId?: ChainIdEnum): Promise<IAssetResponseDto> {
    const cacheKey = `${address}_${chainId}`;

    const cachedResult: IAssetResponseDto = await this.cache.get(cacheKey);

    if (cachedResult) {
      return cachedResult;
    } else {
      const data = await this.httpService
        .post(this.getAssetsUrl, { address, chain: chainId })
        .toPromise();

      await this.cache.set(cacheKey, data.data, { ttl: this.cacheTTLInSeconds });

      return data.data;
    }
  }
}
