import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger, RequestErrorHandler } from '@app/common';

import { getAssetsQuery } from './graphql.queries';
import { MultifarmGetAssetsResponse } from './multifarm.interfaces';

@Injectable()
export class MultifarmGraphqlService {
  private readonly endpoint: string;
  private readonly apiKey: string;

  constructor(
    private http: HttpService,
    private config: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.endpoint = config.get('multifarm.graphQLEndpoint');
    this.apiKey = config.get('multifarm.apiKey');
  }

  @RequestErrorHandler()
  async getAssets(
    skippedFarms: string[],
    offset = 0,
    limit = 20,
    minTVL = 1_000_000,
  ): Promise<MultifarmGetAssetsResponse> {
    const $data = this.http.post(this.endpoint, {
      query: getAssetsQuery,
      variables: {
        offset,
        limit,
        api_key: this.apiKey, // eslint-disable-line camelcase
        find: {
          farm: { $nin: skippedFarms },
          tvlStaked: { $gt: minTVL },
        },
      },
    });

    const { data } = await firstValueFrom($data);
    return data;
  }
}
