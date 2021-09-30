import { EntityRepository, Repository } from 'typeorm';

import { TransferEntityNew } from '../dto/transfers.entity';

@EntityRepository(TransferEntityNew)
export class TransfersRepository extends Repository<TransferEntityNew> {}
