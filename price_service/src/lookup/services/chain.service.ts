import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { SECONDS_IN_HOUR } from '../../utils/time';
import { ChainDto } from '../models';

@Injectable()
export class ChainService {
  cacheTTLInSeconds: number;

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(ChainDto) private readonly repository: Repository<ChainDto>,
  ) {
    this.cacheTTLInSeconds =
      config.get<number>('CHAIN_CACHE_TTL_IN_SECONDS') || 24 * SECONDS_IN_HOUR;
  }

  getAll(): Promise<ChainDto[]> {
    return this.repository.find();
  }

  async getById(id: number): Promise<ChainDto> {
    const cacheKey = `chain_${id}`;
    const cacheValue = await this.cache.get<ChainDto>(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const chain = await this.repository.findOne({ where: { id } });
    await this.cache.set(cacheKey, chain, { ttl: this.cacheTTLInSeconds });

    return chain;
  }
}
