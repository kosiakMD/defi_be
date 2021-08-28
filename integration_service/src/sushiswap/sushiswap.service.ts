import { BaseData } from 'src/interfaces/transactions.interfaces';
import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ProjectEnum } from 'src/common/enum';

import { Mapper } from '../mappers/mapper';
import { SushiswapSubgraph } from '../thegraph/balancer.subgraph';
import { getDataByAddresses } from '../utils/util';
import { SushiswapBurnsEntity } from './entity/sushiswap.burns.entity';
import { SushiswapMintsEntity } from './entity/sushiswap.mints.entity';
import { SushiswapSnapshotsEntity } from './entity/sushiswap.snapshots.entity';
import { SushiswapSwapsEntity } from './entity/sushiswap.swaps.entity';

@Injectable()
export class SushiswapService {
  constructor(
    @InjectRepository(SushiswapSwapsEntity)
    private readonly swapsRepository: Repository<SushiswapSwapsEntity>,
    @InjectRepository(SushiswapMintsEntity)
    private readonly mintsRepository: Repository<SushiswapMintsEntity>,
    @InjectRepository(SushiswapBurnsEntity)
    private readonly burnRepository: Repository<SushiswapBurnsEntity>,
    @InjectRepository(SushiswapSnapshotsEntity)
    private readonly snapshotsRepository: Repository<SushiswapSnapshotsEntity>,
    private readonly sushiswapSubgraph: SushiswapSubgraph,
    private readonly mapper: Mapper,
  ) {}

  async getSushiswapDataByAddresses(addresses: string): Promise<BaseData[]> {
    const originAddressesArray = addresses.split(',');
    const result = await getDataByAddresses(
      this.swapsRepository,
      this.mintsRepository,
      this.burnRepository,
      this.snapshotsRepository,
      originAddressesArray,
      this.sushiswapSubgraph,
    );
    return this.mapper.mapData(
      result.userAddresses,
      originAddressesArray,
      result.response,
      ProjectEnum.sushiswap,
    );
  }
}
