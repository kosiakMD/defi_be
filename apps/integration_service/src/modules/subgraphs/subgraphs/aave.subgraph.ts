import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainDto, ChainIdEnum } from '@app/common';

import { IReserve } from '../../protocols/protocols/aave/aave.interfaces';
import { getReservesQuery } from '../../protocols/protocols/aave/queries/reserves.query';

@Injectable()
export class AaveSubgraph {
  protected readonly subgraphUrls: { [key in keyof typeof ChainIdEnum]?: string };

  constructor(
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    this.subgraphUrls = {
      [ChainIdEnum.eth]: this.configService.get<string>('AAVE_ETH_SUBGRAPH_URL'),
      [ChainIdEnum.plg]: this.configService.get<string>('AAVE_PLG_SUBGRAPH_URL'),
      [ChainIdEnum.avax]: this.configService.get<string>('AAVE_AVAX_SUBGRAPH_URL'),
    };
  }

  getReserves(chainId: ChainIdEnum): Promise<IReserve[]> {
    return this.httpService
      .post(this.subgraphUrls[chainId], {
        query: getReservesQuery,
      })
      .pipe(map((response) => response.data.data.reserves))
      .toPromise();
  }
}
