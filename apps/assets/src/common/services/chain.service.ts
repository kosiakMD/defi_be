import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CacheService } from '@app/common/services/cache.service';

import { Chain } from '../types';

@Injectable()
export class ChainService {
  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
    private readonly httpService: HttpService,
  ) {}

  public getChains(): Promise<Chain[]> {
    return this.cache.getOrLoad('chains', () => this.getChainsFromService());
  }

  private async getChainsFromService(): Promise<Chain[]> {
    const { data: chains } = await firstValueFrom(
      this.httpService.get<Chain[]>(this.config.get('ACCOUNT_SERVICE_CHAINS_LIST_URL')),
    );
    return chains;
  }
}
