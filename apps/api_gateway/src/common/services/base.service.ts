import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger, RequestErrorHandler } from '@app/common';

export class BaseService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {}

  @RequestErrorHandler()
  public async requestProxy(url: string, method = 'GET', query?: any, config?: any) {
    const timeMark = 'request ' + url;
    try {
      this.logger.time(timeMark);

      let data;
      if (method === 'GET') {
        data = await this.httpService
          .get(url, query)
          .pipe(map((response) => response.data))
          .toPromise();
      }
      if (method === 'POST') {
        data = await this.httpService
          .post(url, query, config)
          .pipe(map((response) => response.data))
          .toPromise();
      }

      return data;
    } catch (err) {
      this.logger.error('Base service error:');
      this.logger.error(err);
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      this.logger.timeEnd(timeMark);
    }
  }

  public buildUrl(host, port): string {
    return `${host}${port ? ':' + port : ''}`;
  }
}
