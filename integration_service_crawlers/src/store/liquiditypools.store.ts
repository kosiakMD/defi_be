import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { LiquidityPoolsEntity } from './entities/liquiditypools.entity';
import { LiquidityPoolsRepository } from './repositories/liquiditypools.repository';

@Injectable()
export class LiquidityPoolsStore {
  constructor(
    @InjectRepository(LiquidityPoolsEntity)
    private readonly liquidityPoolsRepository: LiquidityPoolsRepository,
  ) {}

  async getProjectPools(project: string): Promise<LiquidityPoolsEntity[]> {
    return this.liquidityPoolsRepository.find({ where: { project: project } });
  }
}
