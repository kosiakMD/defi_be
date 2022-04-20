import { EntityRepository, Repository } from 'typeorm';

import { AssetsCandidateEntity } from '../entities/assets-candidate.entity';

@EntityRepository(AssetsCandidateEntity)
export class AssetsCandidateRepository extends Repository<AssetsCandidateEntity> {}
