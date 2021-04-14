import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { SECONDS_IN_HOUR } from '../../utils/time';
import { Chain } from '../models';

@Injectable()
export class ChainService {
  cacheTTLInSeconds: number;

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(Chain) private readonly repository: Repository<Chain>,
  ) {
    this.cacheTTLInSeconds =
      config.get<number>('CHAIN_CACHE_TTL_IN_SECONDS') || 24 * SECONDS_IN_HOUR;
  }

  getAll(): Promise<Chain[]> {
    return this.repository.find();
  }

  async getById(id: number): Promise<Chain> {
    const cacheKey = `chain_${id}`;
    const cacheValue = await this.cache.get<Chain>(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const chain = await this.repository.findOne({ where: { id } });
    await this.cache.set(cacheKey, chain, { ttl: this.cacheTTLInSeconds });

    return chain;
  }
}
