import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

@Injectable()
export class AutofarmApiService {
  private autofarmApiUrl;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
  ) {
    this.autofarmApiUrl = this.configService.get<string>('AUTOFARM_API_URL');
  }

  async getAutofarmPoolsData() {
    try {
      const response = await this.httpService
        .get(this.autofarmApiUrl)
        .pipe(map((response) => response.data))
        .toPromise();

      return response?.pools;
    } catch (e) {
      this.logger.error(e.message, 'getAutofarmPoolsData');
      throw e;
    }
  }
}
