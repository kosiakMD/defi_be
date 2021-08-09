import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { SECONDS_IN_HOUR } from '../../utils/time';
import { CurrencyDto } from '../models';
import { CurrencyIdEnum } from 'src/common/enum';

@Injectable()
export class CurrencyService {
  cacheTTLInSeconds: number;

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(CurrencyDto) private readonly repository: Repository<CurrencyDto>,
  ) {
    this.cacheTTLInSeconds =
      config.get<number>('CURRENCY_CACHE_TTL_IN_SECONDS') || 24 * SECONDS_IN_HOUR;
  }

  getAll(): Promise<CurrencyDto[]> {
    return this.repository.find();
  }

  async getById(id: CurrencyIdEnum): Promise<CurrencyDto> {
    const cacheKey = `currency_${id}`;
    const cacheValue = await this.cache.get<CurrencyDto>(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const currency = await this.repository.findOne({ where: { id } });
    await this.cache.set(cacheKey, currency, { ttl: this.cacheTTLInSeconds });

    return currency;
  }
}
