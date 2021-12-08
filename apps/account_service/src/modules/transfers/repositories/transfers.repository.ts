import { EntityRepository, Repository } from 'typeorm';

import { TransferEntityNew } from '../entities/transfers.entity';

@EntityRepository(TransferEntityNew)
export class TransfersRepository extends Repository<TransferEntityNew> {}
