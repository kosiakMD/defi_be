import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  Staked,
  SundaeSwapStakingResponse,
} from '../../protocols/helpers/cardano/cardano.interface';
import { FARMS_BY_ADDRESS_QUERY } from '../../protocols/protocols/sundaeswap/sundaeswap.queries';

@Injectable()
export class SundaeSwapSubgraph {
  private readonly subgraphUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrl = this.configService.get<string>('SUNDAESWAP_URL');
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
