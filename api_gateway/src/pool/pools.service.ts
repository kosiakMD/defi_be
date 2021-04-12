import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
import { Pool } from '../common/interfaces';

@Injectable()
export class PoolsService {
  private readonly poolsUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const url = this.configService.get<string>('POOLS_SERVICE_URL');
    const path = this.configService.get<string>('POOLS_PATH');

    this.poolsUrl = `${url}/${path}`;
  }

  async getAll(): Promise<Pool[][]> {
    try {
      const get = this.httpService.get(this.poolsUrl);
      const promise = get.toPromise();
      this.logger.time(this.poolsUrl);
      const result = await promise;
      this.logger.timeEnd(this.poolsUrl);
      const { data } = result;
      return data;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
