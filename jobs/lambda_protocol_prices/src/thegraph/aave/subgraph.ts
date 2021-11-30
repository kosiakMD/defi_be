import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IAaveTokens } from './interfaces';
import * as Queries from './queries';

@Injectable()
export class AaveSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.subgraphUrl = this.configService.get<string>('AAVE_SUBGRAPH_URL');
  }

  async getTokens(): Promise<IAaveTokens> {
    const tokens$ = this.httpService
      .post(this.subgraphUrl, {
        query: Queries.GetTokens,
      })
      .pipe(map((response) => response.data.data));

    return await firstValueFrom(tokens$);
  }
}
