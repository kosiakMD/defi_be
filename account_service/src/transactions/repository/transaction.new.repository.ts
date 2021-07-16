import { EntityRepository, Repository } from 'typeorm';

import { TransactionNewEntity } from '../entity/transaction.new.entity';

@EntityRepository(TransactionNewEntity)
export class TransactionNewRepository extends Repository<TransactionNewEntity> {}
