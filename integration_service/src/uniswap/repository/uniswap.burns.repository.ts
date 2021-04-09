import { EntityRepository, Repository } from 'typeorm';

import { UniswapBurnsEntity } from '../entities/uniswap.burns.entity';

@EntityRepository(UniswapBurnsEntity)
export class UniswapBurnsRepository extends Repository<UniswapBurnsEntity> {}
