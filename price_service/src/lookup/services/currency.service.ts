import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { Chain, Currency } from '../models';

@Injectable()
export class CurrencyService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(Currency) private readonly repository: Repository<Currency>,
  ) {}

  getAll(): Promise<Currency[]> {
    return this.repository.find();
  }

  async getById(id: number): Promise<Currency> {
    const cacheKey = id.toString();
    const cacheValue = await this.cache.get<Chain>(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const currency = await this.repository.findOne({ where: { id } });
    await this.cache.set(cacheKey, currency);

    return currency;
  }
}
