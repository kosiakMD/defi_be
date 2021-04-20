import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Base } from '../interfaces/transactions.interfaces';
import { Mapper } from '../mappers/mapper';
import { PancakeSubgraph } from '../thegraph/pancake.subgraph';
import { getDataByAddresses } from '../utils/util';
import { PancakeBurnsEntity } from './entity/pancake.burns.entity';
import { PancakeMintsEntity } from './entity/pancake.mints.entity';
import { PancakeSnapshotsEntity } from './entity/pancake.snapshots.entity';
import { PancakeSwapsEntity } from './entity/pancake.swaps.entity';

@Injectable()
export class PancakeService {
  constructor(
    @InjectRepository(PancakeSwapsEntity)
    private readonly swapsRepository: Repository<PancakeSwapsEntity>,
    @InjectRepository(PancakeMintsEntity)
    private readonly mintsRepository: Repository<PancakeMintsEntity>,
    @InjectRepository(PancakeBurnsEntity)
    private readonly burnsRepository: Repository<PancakeBurnsEntity>,
    @InjectRepository(PancakeSnapshotsEntity)
    private readonly snapshotsRepository: Repository<PancakeSnapshotsEntity>,
    private readonly mapper: Mapper,
    private readonly pancakeSubgraph: PancakeSubgraph,
  ) {}
  async getData(addresses: string): Promise<Base[]> {
    const originAddressesArray = addresses.split(',');

    const result = await getDataByAddresses(
      this.swapsRepository,
      this.mintsRepository,
      this.burnsRepository,
      this.snapshotsRepository,
      originAddressesArray,
      this.pancakeSubgraph,
    );
    return this.mapper.mapData(
      result.userAddresses,
      originAddressesArray,
      result.response,
      'pancake',
    );
  }
}
