import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map } from 'rxjs/operators';

import { Chief } from './chief.interface';
import { Pool } from './pool.interface';

@Injectable()
export class SushimasterchiefSubgraph {
  protected subgraphUrl: string;
  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.subgraphUrl = this.configService.get<string>('VAULT_SUSHISWAP_SUBGRAPH_URL');
  }
  async getActiveVaults(): Promise<PoolsData> {
    return this.httpService
      .post<PoolsData>(this.subgraphUrl, {
        operationName: 'poolsForVaults',
        variables: {},
        query: `{
				pools (where:{allocPoint_not:"0"}, first: 200) {
					id
					pair
					balance
					allocPoint
				}
				chief: masterChefs {
					id
					sushiPerBlock
					totalAllocPoint
				}
			}`,
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }
}

export interface PoolsData {
  data: {
    pools: Pool[];
    chief: Chief;
  };
}
