import { EntityRepository, Repository } from 'typeorm';

import { ApprovalsEntity } from '../entities/approvals.entity';

@EntityRepository(ApprovalsEntity)
export class ApprovalsRepository extends Repository<ApprovalsEntity> {
  findAll(take, skip): Promise<ApprovalsEntity[]> {
    return this.find({ take, skip });
  }
}
