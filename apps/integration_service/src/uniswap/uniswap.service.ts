import { Injectable } from '@nestjs/common';

import { ProjectEnum, UniswapProtocolEnum } from '@app/common/enum';

import { BaseData } from '../interfaces/transactions.interfaces';
import { Mapper } from '../mappers/mapper';
import { UniswapSubgraph } from '../thegraph/uniswap.subgraph';
import { getDataByAddresses } from '../utils/util';

@Injectable()
export class UniswapService {
  constructor(private readonly uniswapSubgraph: UniswapSubgraph, private readonly mapper: Mapper) {}

  public getDataByAddresses = async (addresses: string): Promise<BaseData[]> => {
    const originAddressesArray = addresses.split(',');

    const result = await getDataByAddresses(originAddressesArray, this.uniswapSubgraph);

    return this.mapper.mapData(
      result.userAddresses,
      originAddressesArray,
      result.response,
      ProjectEnum.uniswap,
      UniswapProtocolEnum.uniswapV2,
    );
  };
}
