import { Cache } from 'cache-manager';

import { HttpService, Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DetailedResponseDto } from '@app/common/dto';
import { ChainIdEnum } from '@app/common/enum';
import { Address, BalancesResponse } from '@app/common/types';

import { Asset } from '../interfaces/transactions.interfaces';

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

    const host = this.configService.get<string>('ACCOUNT_SERVICE_HOST');
    const port = this.configService.get<string>('ACCOUNT_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const balancePath = this.configService.get<string>('ACCOUNT_BALANCE');
    this.getBalanceUrl = `${url}/${balancePath}`;

    this.getBalanceCovalentUrl = `${url}/v1/balances/covalent`;

    const assetsPath = this.configService.get<string>('ACCOUNT_ASSETS');
    this.getAssetsUrl = `${url}/${assetsPath}`;
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

  async getBalancesCovalent(
    addresses: Address[],
    chains?: ChainIdEnum[],
  ): Promise<BalancesResponse> {
    const data = await this.httpService
      .get(this.getBalanceCovalentUrl, { params: { addresses, chains } })
      .toPromise();
    return data.data;
  }

  async getAssets(
    addresses: Address[],
    chains?: ChainIdEnum[],
  ): Promise<DetailedResponseDto<Asset[]>> {
    const cacheKey = `${addresses.join(',')}_${chains.join(',')}`;

    const cachedResult: DetailedResponseDto<Asset[]> = await this.cache.get(cacheKey);

    if (cachedResult) {
      return cachedResult;
    } else {
      const data = await this.httpService
        .get(this.getAssetsUrl, { params: { addresses, chains } })
        .toPromise();

      await this.cache.set(cacheKey, data.data, { ttl: this.cacheTTLInSeconds });

      return data.data;
    }
  }
}
