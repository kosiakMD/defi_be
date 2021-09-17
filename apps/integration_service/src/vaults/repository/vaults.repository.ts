import { EntityRepository, Repository } from 'typeorm';

import { VaultsEntity } from '../entities/vaults.entity';

@EntityRepository(VaultsEntity)
export class VaultsRepository extends Repository<VaultsEntity> {}
