import { EntityRepository, Repository } from 'typeorm';

import { PriceSourceEntity } from '../entities/price-source.entity';

@EntityRepository(PriceSourceEntity)
export class PriceSourceRepository extends Repository<PriceSourceEntity> {}
