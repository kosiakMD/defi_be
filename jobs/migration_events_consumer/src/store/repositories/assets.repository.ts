import { EntityRepository, Repository } from 'typeorm';

import { AssetsEntity } from '../entities/assets.entity';

@EntityRepository(AssetsEntity)
export class AssetsRepository extends Repository<AssetsEntity> {}
