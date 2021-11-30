import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IYearnVaults } from './interfaces';
import * as Queries from './queries';

@Injectable()
export class YearnSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.subgraphUrl = this.configService.get<string>('YEARN_V2_SUBGRAPH_URL');
  }

  async getVaults(): Promise<{ vaults: IYearnVaults[] }> {
    const vaults$ = this.httpService
      .post(this.subgraphUrl, {
        query: Queries.GetVaults,
      })
      .pipe(map((response) => response.data.data));

    return await firstValueFrom(vaults$);
  }
}
