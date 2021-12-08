import { EntityRepository, Repository } from 'typeorm';

import { TransactionsNewEntity } from '../entities/transactions.new.entity';

@EntityRepository(TransactionsNewEntity)
export class TransactionsNewRepository extends Repository<TransactionsNewEntity> {}
