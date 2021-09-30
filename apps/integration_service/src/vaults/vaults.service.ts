import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { VaultsEntity } from './entities/vaults.entity';
import { VaultsRepository } from './repository/vaults.repository';

@Injectable()
export class VaultsService {
  constructor(
    @InjectRepository(VaultsEntity) private readonly vaultsRepository: VaultsRepository,
  ) {}

  getPoolsToDisplay(): Promise<VaultsEntity[]> {
    return this.vaultsRepository
      .createQueryBuilder('vaults')
      .where('vaults.updated_at = (select max(updated_at) from vaults)')
      .getMany();
  }
}
