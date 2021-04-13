import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { Chain } from '../models';

@Injectable()
export class ChainService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(Chain) private readonly repository: Repository<Chain>,
  ) {}

  getAll(): Promise<Chain[]> {
    return this.repository.find();
  }

  async getById(id: number): Promise<Chain> {
    const cacheKey = id.toString();
    const cacheValue = await this.cache.get<Chain>(cacheKey);
    if (cacheValue) {
      return cacheValue;
    }

    const chain = await this.repository.findOne({ where: { id } });
    await this.cache.set(cacheKey, chain);

    return chain;
  }
}
