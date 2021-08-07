import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PlatformEnum, UniswapProtocolEnum } from 'src/common/enum';

import { BaseData } from '../interfaces/transactions.interfaces';
import { Mapper } from '../mappers/mapper';
import { UniswapSubgraph } from '../thegraph/uniswap.subgraph';
import { getDataByAddresses } from '../utils/util';
import { UniswapBurnsEntity } from './entities/uniswap.burns.entity';
import { UniswapMintsEntity } from './entities/uniswap.mints.entity';
import { UniswapSnapshotsEntity } from './entities/uniswap.snapshots.entity';
import { UniswapSwapsEntity } from './entities/uniswap.swaps.entity';
import { UniswapBurnsRepository } from './repository/uniswap.burns.repository';
import { UniswapMintsRepository } from './repository/uniswap.mints.repository';
import { UniswapSnapshotsRepository } from './repository/uniswap.snapshots.repository';
import { UniswapSwapsRepository } from './repository/uniswap.swaps.repository';

@Injectable()
export class UniswapService {
  constructor(
    @InjectRepository(UniswapSwapsEntity) private readonly swapsRepository: UniswapSwapsRepository,
    @InjectRepository(UniswapMintsEntity) private readonly mintsRepository: UniswapMintsRepository,
    @InjectRepository(UniswapBurnsEntity) private readonly burnRepository: UniswapBurnsRepository,
    @InjectRepository(UniswapSnapshotsEntity)
    private readonly snapshotsRepository: UniswapSnapshotsRepository,
    private readonly uniswapSubgraph: UniswapSubgraph,
    private readonly mapper: Mapper,
  ) {}

  async getDataByAddress(addresses: string): Promise<BaseData[]> {
    const originAddressesArray = addresses.split(',');

    const result = await getDataByAddresses(
      this.swapsRepository,
      this.mintsRepository,
      this.burnRepository,
      this.snapshotsRepository,
      originAddressesArray,
      this.uniswapSubgraph,
    );

    return this.mapper.mapData(
      result.userAddresses,
      originAddressesArray,
      result.response,
      PlatformEnum.uniswap,
      UniswapProtocolEnum.protocolV2,
    );
  }
}
