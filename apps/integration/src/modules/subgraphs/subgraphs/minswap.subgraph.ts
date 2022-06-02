import { map, firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  MinswapStaked,
  MinswapStakingResponse,
} from '../../protocols/helpers/cardano/cardano.interface';
import { FARMS_BY_ADDRESS_QUERY } from '../../protocols/protocols/minswap/minswap.queries';

@Injectable()
export class MinswapSubgraph {
  private readonly subgraphUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrl = this.configService.get<string>('MINSWAP_URL');
  }

  public async getAccountFarms(address: string): Promise<MinswapStaked[]> {
    const data = await firstValueFrom(
      this.httpService
        .post<MinswapStakingResponse>(
          this.subgraphUrl,
          {
            query: FARMS_BY_ADDRESS_QUERY,
            variables: { address },
          },
          {
            headers: { origin: 'https://defiyield.app' },
          },
        )
        .pipe(map((response) => response.data)),
    );
    return data?.data?.farmPoolInfo || [];
  }
}
