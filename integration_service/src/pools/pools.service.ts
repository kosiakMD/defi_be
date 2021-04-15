import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { LiquidityPoolsEntity } from './entities/liquidity.pools.entity';
import { LiquidityPoolsRepository } from './repository/liquidity.pools.repository';

@Injectable()
export class PoolsService {
  private minReserveUdsToDisplay = 1000000;
  constructor(
    @InjectRepository(LiquidityPoolsEntity)
    private readonly liquidityPoolsRepository: LiquidityPoolsRepository,
  ) {}

  getPoolsToDisplay(): Promise<LiquidityPoolsEntity[]> {
    return this.liquidityPoolsRepository
      .createQueryBuilder('pools')
      .andWhere('pools.reserveUsd > :minReserveUsd', { minReserveUsd: this.minReserveUdsToDisplay })
      .getMany();
  }
}
