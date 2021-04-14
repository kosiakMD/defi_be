import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { SECONDS_IN_HOUR } from '../../utils/time';
import { Chain, Currency } from '../models';

@Injectable()
export class CurrencyService {
  cacheTTLInSeconds: number;

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(Currency) private readonly repository: Repository<Currency>,
  ) {
    this.cacheTTLInSeconds =
      config.get<number>('CURRENCY_CACHE_TTL_IN_SECONDS') || 24 * SECONDS_IN_HOUR;
  }

  getAll(): Promise<Currency[]> {
    return this.repository.find();
  }

  async getById(id: number): Promise<Currency> {
    const cacheKey = `currency_${id}`;
    const cacheValue = await this.cache.get<Chain>(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const currency = await this.repository.findOne({ where: { id } });
    await this.cache.set(cacheKey, currency, { ttl: this.cacheTTLInSeconds });

    return currency;
  }
}
