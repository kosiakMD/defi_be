import { EntityRepository, Repository } from 'typeorm';

import { UniswapMintsEntity } from '../entities/uniswap.mints.entity';

@EntityRepository(UniswapMintsEntity)
export class UniswapMintsRepository extends Repository<UniswapMintsEntity> {}
