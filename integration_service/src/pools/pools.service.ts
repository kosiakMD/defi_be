import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { PancakeProtocolEnum, ProjectEnum, UniswapProtocolEnum } from 'src/common/enum';

import { LiquidityPoolsResponseDto } from './dto/liquidity.pools.response.dto';
import { LiquidityPoolsEntity } from './entities/liquidity.pools.entity';
import {
  PANCAKE_MIN_RESERVE,
  SUSHISWAP_MIN_RESERVE,
  UNI_MIN_RESERVE,
  UNI_PAIRS_BLACKLIST,
} from './pools.setting';
import { LiquidityPoolsRepository } from './repository/liquidity.pools.repository';

@Injectable()
export class PoolsService {
  static cacheTTLInSeconds: number;

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(LiquidityPoolsEntity)
    private readonly liquidityPoolsRepository: LiquidityPoolsRepository,
  ) {
    PoolsService.cacheTTLInSeconds = config.get<number>('POOLS_CACHE_TTL_IN_SECONDS') || 5 * 60;
  }

  static getCacheKey(seed?: string): string {
    return `pools_${seed}`;
  }

  async getPoolsToDisplay(): Promise<LiquidityPoolsResponseDto[]> {
    const cacheSeed = 'allPools';
    const cachedPools = await this.getCachedPools(cacheSeed);

    if (cachedPools?.length) {
      return cachedPools;
    }

    const dbPools = await this.liquidityPoolsRepository
      .createQueryBuilder('pools')
      .orWhere('pools.updated_at = (select max(updated_at) from liquidity_pools)')
      .orWhere("pools.project = '" + PancakeProtocolEnum.pancakeV2 + "'")
      .getMany();

    const dtoPools: LiquidityPoolsResponseDto[] = this.fromEntityToDtos(dbPools);

    const uniswapPools = dtoPools.filter((p) => {
      return (
        p.project === UniswapProtocolEnum.uniswapV2 &&
        p.reserveUsd > UNI_MIN_RESERVE &&
        !UNI_PAIRS_BLACKLIST.find((address) => address === p.address)
      );
    });

    const sushiswapPools = dtoPools.filter((p) => {
      return p.project === ProjectEnum.sushiswap && p.reserveUsd > SUSHISWAP_MIN_RESERVE;
    });

    const pancakePools = dtoPools.filter((p) => {
      return p.project === PancakeProtocolEnum.pancakeV1 && p.reserveUsd > PANCAKE_MIN_RESERVE;
    });

    const pancakeV2Pools = dtoPools.filter((p) => {
      return p.project === PancakeProtocolEnum.pancakeV2 && p.reserveUsd > PANCAKE_MIN_RESERVE;
    });

    const allPools = [...uniswapPools, ...sushiswapPools, ...pancakePools, ...pancakeV2Pools];

    await this.updateCachePools(allPools, cacheSeed);

    return allPools;
  }

  async getProjectPools(project: PancakeProtocolEnum): Promise<LiquidityPoolsResponseDto[]> {
    const cachedPools = await this.getCachedPools(project);

    if (cachedPools?.length) {
      return cachedPools;
    }

    const dbPools = await this.liquidityPoolsRepository
      .createQueryBuilder('pools')
      .where('pools.project = :project', { project: project })
      .getMany();

    const dtoPools: LiquidityPoolsResponseDto[] = this.fromEntityToDtos(dbPools);
    await this.updateCachePools(dtoPools, project);

    return dtoPools;
  }

  private fromEntityToDtos(entities: LiquidityPoolsEntity[]): LiquidityPoolsResponseDto[] {
    const dtoPools: LiquidityPoolsResponseDto[] = [];
    entities.forEach((dbPool) => {
      const poolDto = plainToClass(LiquidityPoolsResponseDto, dbPool);
      // TODO: m.b. put logic to DTO
      dbPool.project === ProjectEnum.uniswap && (poolDto.project = UniswapProtocolEnum.uniswapV2);
      dtoPools.push(poolDto);
    });
    return dtoPools;
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
