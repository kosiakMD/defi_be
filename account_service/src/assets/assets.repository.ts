import { EntityRepository, Repository } from 'typeorm';

import { AssetsEntity } from './assets.entity';

@EntityRepository(AssetsEntity)
export class AssetsRepository extends Repository<AssetsEntity> {}
