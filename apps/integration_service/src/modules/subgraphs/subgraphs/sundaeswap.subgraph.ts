import { map, firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  Pool,
  Staked,
  SundaeSwapPoolsResponse,
  SundaeSwapStakingResponse,
} from '../../protocols/protocols/sundaeswap/sundaeswap.interface';
import {
  POOLS_BY_ADDRESS_QUERY,
  FARMS_BY_ADDRESS_QUERY,
} from '../../protocols/protocols/sundaeswap/sundaeswap.queries';

@Injectable()
export class SundaeSwapSubgraph {
  private readonly subgraphUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrl = this.configService.get<string>('SUNDAESWAP_URL');
  }

  public async getAccountPools(addresses: string[]): Promise<Pool[]> {
    const data = await firstValueFrom(
      this.httpService
        .post<SundaeSwapPoolsResponse>(this.subgraphUrl, {
          query: POOLS_BY_ADDRESS_QUERY,
          variables: { assetIds: addresses, pageSize: 200 },
        })
        .pipe(map((response) => response.data)),
    );
    return data?.data?.pools || [];
  }

  public async getAccountFarms(address: string): Promise<Staked[]> {
    const data = await firstValueFrom(
      this.httpService
        .post<SundaeSwapStakingResponse>(this.subgraphUrl, {
          query: FARMS_BY_ADDRESS_QUERY,
          variables: { address },
        })
        .pipe(map((response) => response.data)),
    );
    return data?.data?.freezerOpen?.items || [];
  }
}
