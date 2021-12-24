import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { getManager } from 'typeorm';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PancakeProtocolEnum } from '@app/common/enum';

import { LiquidityPoolsResponseDto } from './dto/liquidity.pools.response.dto';
import { LiquidityPoolsRawData } from './pancake.interfaces';

@Injectable()
export class PoolsService {
  static cacheTTLInSeconds: number;

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    PoolsService.cacheTTLInSeconds = config.get<number>('POOLS_CACHE_TTL_IN_SECONDS') || 5 * 60;
  }

  static getCacheKey(seed?: string): string {
    return `pools_${seed}`;
  }

  async getProjectPools(project: PancakeProtocolEnum): Promise<LiquidityPoolsResponseDto[]> {
    const cachedPools = await this.getCachedPools(project);

    if (cachedPools?.length) {
      return cachedPools;
    }

    const dbPools = await getManager().query(
      `(select * from liquidity_pools where liquidity_pools.project = '${project}')`,
    );

    const dtoPools: LiquidityPoolsResponseDto[] = this.fromEntityToDtos(dbPools);
    await this.updateCachePools(dtoPools, project);

    return dtoPools;
  }

  private fromEntityToDtos(entities: LiquidityPoolsRawData[]): LiquidityPoolsResponseDto[] {
    return entities.map((dbPool) => {
      return plainToClass(LiquidityPoolsResponseDto, dbPool);
    });
  }

  private getCachedPools(seed: string): Promise<LiquidityPoolsResponseDto[]> {
    return this.cache.get<LiquidityPoolsResponseDto[]>(PoolsService.getCacheKey(seed));
  }

  private updateCachePools(
    pools: LiquidityPoolsResponseDto[],
    seed: string,
  ): Promise<LiquidityPoolsResponseDto[]> {
    return this.cache.set(PoolsService.getCacheKey(seed), pools, {
      ttl: PoolsService.cacheTTLInSeconds,
    });
  }
}
