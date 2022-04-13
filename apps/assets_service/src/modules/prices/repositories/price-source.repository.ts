import { EntityRepository, Repository } from 'typeorm';

import { PriceSourceEntity } from '../entities/price-sources.entity';

@EntityRepository(PriceSourceEntity)
export class PriceSourceRepository extends Repository<PriceSourceEntity> {}
