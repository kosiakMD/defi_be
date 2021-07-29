import { EntityRepository, Repository } from 'typeorm';

import { AssetTransfersEntity } from '../entities/assettransfers.entity';

@EntityRepository(AssetTransfersEntity)
export class AssetTransfersRepository extends Repository<AssetTransfersEntity> {}
