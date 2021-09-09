import { Cache } from 'cache-manager';

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
  cacheTTLInSeconds: number;

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(LiquidityPoolsEntity)
    private readonly liquidityPoolsRepository: LiquidityPoolsRepository,
  ) {
    this.cacheTTLInSeconds = config.get<number>('POOLS_CACHE_TTL_IN_SECONDS') || 5 * 60;
  }

  async getPoolsToDisplay(): Promise<LiquidityPoolsResponseDto[]> {
    const cachedPools = await this.getCachedPools();

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
        p.project === ProjectEnum.uniswap &&
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

    await this.updateCachePools(allPools);

    return allPools;
  }

  async getProjectPools(project: string): Promise<LiquidityPoolsResponseDto[]> {
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
      const poolDto = new LiquidityPoolsResponseDto();
      poolDto.id = +dbPool.id;
      poolDto.address = dbPool.address;
      poolDto.chain = +dbPool.chain;
      poolDto.project =
        dbPool.project === ProjectEnum.uniswap ? UniswapProtocolEnum.uniswapV2 : dbPool.project;
      poolDto.reserveUsd = +dbPool.reserveUsd;
      poolDto.apy = dbPool.apy;
      poolDto.il = dbPool.il;
      poolDto.token = dbPool.token;
      poolDto.poolTokens = dbPool.poolTokens;
      poolDto.createdAt = dbPool.createdAt;
      poolDto.updatedAt = dbPool.updatedAt;
      dtoPools.push(poolDto);
    });
    return dtoPools;
  }

  private async getCachedPools(seed?: string): Promise<LiquidityPoolsResponseDto[]> {
    return await this.cache.get<LiquidityPoolsResponseDto[]>(this.getCacheKey(seed));
  }

  private async updateCachePools(pools: LiquidityPoolsResponseDto[], seed?: string): Promise<void> {
    await this.cache.set(this.getCacheKey(seed), pools, { ttl: this.cacheTTLInSeconds });
  }

  private getCacheKey(seed?: string): string {
    return `pools_${seed}`;
  }
}
