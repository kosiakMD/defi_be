import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { LiquidityPoolsEntity } from './entities/liquidity.pools.entity';
import {
  PANCAKE_MIN_RESERVE,
  PROJECT_PANCAKE,
  PROJECT_SUSHISWAP,
  PROJECT_UNISWAP,
  SUSHISWAP_MIN_RESERVE,
  UNI_MIN_RESERVE,
  UNI_PAIRS_BLACKLIST,
} from './pools.setting';
import { LiquidityPoolsRepository } from './repository/liquidity.pools.repository';

@Injectable()
export class PoolsService {
  constructor(
    @InjectRepository(LiquidityPoolsEntity)
    private readonly liquidityPoolsRepository: LiquidityPoolsRepository,
  ) {}

  async getPoolsToDisplay(): Promise<LiquidityPoolsEntity[]> {
    const dbPools = await this.liquidityPoolsRepository
      .createQueryBuilder('pools')
      .where('pools.updated_at = (select max(updated_at) from liquidity_pools)')
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

    return [...uniswapPools, ...sushiswapPools, ...pancakePools];
  }

  async getProjectPools(project: string): Promise<LiquidityPoolsEntity[]> {
    return this.liquidityPoolsRepository
      .createQueryBuilder('pools')
      .where('pools.project = :project', { project: project })
      .getMany();
  }
}
