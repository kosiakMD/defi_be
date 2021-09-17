import { Injectable } from '@nestjs/common';

import { ProjectEnum } from '@app/common/enum';

import { BaseData } from '../interfaces/transactions.interfaces';
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
