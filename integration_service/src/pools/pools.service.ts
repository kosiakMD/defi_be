import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';

import { LiquidityPoolsEntity } from './entities/liquidity.pools.entity';
import {
  PANCAKE_MIN_RESERVE,
  PROJECT_PANCAKE,
  PROJECT_SUSHISWAP,
  PROJECT_UNISWAP,
  SUSHISWAP_MIN_RESERVE,
  UNI_MIN_RESERVE,
  UNI_PAIRS_BLACKLIST,
  PROJECT_PANCAKE_V2,
} from './pools.setting';
import { LiquidityPoolsRepository } from './repository/liquidity.pools.repository';

@Injectable()
export class PoolsService {
  cacheTTLInSeconds: number;

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(LiquidityPoolsEntity)
    private readonly liquidityPoolsRepository: LiquidityPoolsRepository,
  ) {
    this.cacheTTLInSeconds = config.get<number>('POOLS_CACHE_TTL_IN_SECONDS') || 5 * 60;
  }

  async getPoolsToDisplay(): Promise<LiquidityPoolsEntity[]> {
    const cachedPools = await this.getCachedPools();

    if (cachedPools?.length) {
      return cachedPools;
    }

    const dbPools = await this.liquidityPoolsRepository
      .createQueryBuilder('pools')
      .orWhere('pools.updated_at = (select max(updated_at) from liquidity_pools)')
      .orWhere("pools.project = 'Pancake V2'")
      .getMany();

    const uniswapPools = dbPools.filter((p) => {
      return (
        p.project === PROJECT_UNISWAP &&
        p.reserveUsd > UNI_MIN_RESERVE &&
        !UNI_PAIRS_BLACKLIST.find((address) => address === p.address)
      );
    });

    const sushiswapPools = dbPools.filter((p) => {
      return p.project === PROJECT_SUSHISWAP && p.reserveUsd > SUSHISWAP_MIN_RESERVE;
    });

    const pancakePools = dbPools.filter((p) => {
      return p.project === PROJECT_PANCAKE && p.reserveUsd > PANCAKE_MIN_RESERVE;
    });

    const pancakeV2Pools = dbPools.filter((p) => {
      return p.project === PROJECT_PANCAKE_V2 && p.reserveUsd > PANCAKE_MIN_RESERVE;
    });

    const allPools = [...uniswapPools, ...sushiswapPools, ...pancakePools, ...pancakeV2Pools];

    this.updateCachePools(allPools);

    return allPools;
  }

  async getProjectPools(project: string): Promise<LiquidityPoolsEntity[]> {
    const cachedPools = await this.getCachedPools(project);

    if (cachedPools?.length) {
      return cachedPools;
    }

    const dbPools = await this.liquidityPoolsRepository
      .createQueryBuilder('pools')
      .where('pools.project = :project', { project: project })
      .getMany();

    this.updateCachePools(dbPools, project);

    return dbPools;
  }

  private async getCachedPools(seed?: string): Promise<LiquidityPoolsEntity[]> {
    return await this.cache.get<LiquidityPoolsEntity[]>(this.getCacheKey(seed));
  }

  private async updateCachePools(pools: LiquidityPoolsEntity[], seed?: string): Promise<void> {
    this.cache.set(this.getCacheKey(seed), pools, { ttl: this.cacheTTLInSeconds });
  }

  private getCacheKey(seed?: string): string {
    return `pools_${seed}`;
  }
}
