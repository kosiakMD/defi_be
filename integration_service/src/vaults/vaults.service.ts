import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { VaultsEntity } from './entities/vaults.entity';
import { VaultsRepository } from './repository/vaults.repository';

@Injectable()
export class VaultsService {
  private minReserveUdsToDisplay = 100000;
  constructor(
    @InjectRepository(VaultsEntity) private readonly vaultsRepository: VaultsRepository,
  ) {}

  getPoolsToDisplay(): Promise<VaultsEntity[]> {
    return this.vaultsRepository
      .createQueryBuilder('vaults')
      .andWhere('vaults.tvl > :minReserveUsd', { minReserveUsd: this.minReserveUdsToDisplay })
      .getMany();
  }
}
