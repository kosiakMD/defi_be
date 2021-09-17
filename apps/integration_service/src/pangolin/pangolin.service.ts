import { Injectable } from '@nestjs/common';

import { ProjectEnum } from '@app/common/enum';

import { BaseData } from '../interfaces/transactions.interfaces';
import { Mapper } from '../mappers/mapper';
import { PangolinSubgraph } from '../thegraph/pangolin.subgraph';
import { getDataByAddresses } from '../utils/util';

@Injectable()
export class PangolinService {
  constructor(
    private readonly pangolinSubgraph: PangolinSubgraph,
    private readonly mapper: Mapper,
  ) {}

  async getDataByAddresses(addresses: string): Promise<BaseData[]> {
    const originAddressesArray = addresses.split(',');
    const result = await getDataByAddresses(originAddressesArray, this.pangolinSubgraph);
    return this.mapper.mapData(
      result.userAddresses,
      originAddressesArray,
      result.response,
      ProjectEnum.pangolin,
    );
  }
}
