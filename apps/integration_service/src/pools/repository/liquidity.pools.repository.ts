import { EntityRepository, Repository } from 'typeorm';

import { LiquidityPoolsEntity } from '../entities/liquidity.pools.entity';

@EntityRepository(LiquidityPoolsEntity)
export class LiquidityPoolsRepository extends Repository<LiquidityPoolsEntity> {}
