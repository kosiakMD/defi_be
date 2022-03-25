import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
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
  public async requestProxy<T = any>(
    urlData: string | string[],
    method = 'GET',
    query?: any,
    config?: any,
  ) {
    const url = this.parseUrl(urlData);

    const timeMark = 'request ' + url;
    try {
      this.logger.time(timeMark);

      let request: Observable<AxiosResponse<T>>;
      if (method === 'GET') {
        request = this.httpService.get<T>(url, query);
      } else if (method === 'POST') {
        request = this.httpService.post<T>(url, query, config);
      } else if (method === 'PUT') {
        request = this.httpService.put<T>(url, query, config);
      } else if (method === 'PATCH') {
        request = this.httpService.patch<T>(url, query, config);
      }

      return await request.pipe(map((response) => response.data)).toPromise();
    } catch (err: any) {
      this.logger.error(err, err.stack, 'Base service error');
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      this.logger.timeEnd(timeMark);
    }
  }

  public buildUrl(host, port?): string {
    let url = `${host}${port ? ':' + port : ''}`;
    url += url.charAt(url.length - 1) === '/' ? '' : '/';
    return url;
  }

  private parseUrl(url: string | string[]): string {
    if (Array.isArray(url)) {
      return new URL(url[0], url[1]).toString();
    }

    return url;
  }
}
