import { EntityRepository, Repository } from 'typeorm';

import { UniswapSnapshotsEntity } from '../entities/uniswap.snapshots.entity';

@EntityRepository(UniswapSnapshotsEntity)
export class UniswapSnapshotsRepository extends Repository<UniswapSnapshotsEntity> {}
