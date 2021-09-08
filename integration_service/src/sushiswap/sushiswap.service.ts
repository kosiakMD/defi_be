import { BaseData } from 'src/interfaces/transactions.interfaces';

import { Injectable } from '@nestjs/common';

import { ProjectEnum } from 'src/common/enum';

import { Mapper } from '../mappers/mapper';
import { SushiswapSubgraph } from '../thegraph/sushiswap.subgraph';
import { getDataByAddresses } from '../utils/util';

@Injectable()
export class SushiswapService {
  constructor(
    private readonly sushiswapSubgraph: SushiswapSubgraph,
    private readonly mapper: Mapper,
  ) {}

  async getDataByAddresses(addresses: string): Promise<BaseData[]> {
    const originAddressesArray = addresses.split(',');
    const result = await getDataByAddresses(originAddressesArray, this.sushiswapSubgraph);
    return this.mapper.mapData(
      result.userAddresses,
      originAddressesArray,
      result.response,
      ProjectEnum.sushiswap,
    );
  }
}
