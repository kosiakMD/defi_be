import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { BlacklistedAddress } from './blacklisted.address';

@Injectable()
export class BlacklistService {
  private readonly blacklistUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('ACCOUNT_SERVICE_HOST');
    const port = this.configService.get<string>('ACCOUNT_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    this.blacklistUrl = `${url}/v1/blacklist`;
  }

  async getAll(): Promise<BlacklistedAddress[]> {
    try {
      this.logger.time(this.blacklistUrl);
      const data = await this.httpService
        .get(this.blacklistUrl)
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.blacklistUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }
}
