import { EntityRepository, Repository } from 'typeorm';

import { LiquidityPoolsEntity } from '../entities/liquiditypools.entity';

@EntityRepository(LiquidityPoolsEntity)
export class LiquidityPoolsRepository extends Repository<LiquidityPoolsEntity> {}
