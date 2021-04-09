import { EntityRepository, Repository } from 'typeorm';

import { UniswapSwapsEntity } from '../entities/uniswap.swaps.entity';

@EntityRepository(UniswapSwapsEntity)
export class UniswapSwapsRepository extends Repository<UniswapSwapsEntity> {}
