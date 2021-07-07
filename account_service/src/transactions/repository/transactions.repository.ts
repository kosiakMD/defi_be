import { EntityRepository, Repository } from 'typeorm';

import { TransactionsEntity } from '../entity/transactions.entity';

@EntityRepository(TransactionsEntity)
export class TransactionsRepository extends Repository<TransactionsEntity> {}
