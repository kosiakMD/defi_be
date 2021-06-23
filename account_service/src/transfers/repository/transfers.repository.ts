import { EntityRepository, Repository } from 'typeorm';

import { TransferEntity } from '../dto/transfers.entity';

@EntityRepository(TransferEntity)
export class TransfersRepository extends Repository<TransferEntity> {}
