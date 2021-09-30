import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { Token } from '@app/common/interfaces';

@Injectable()
export class TokensService {
  private readonly tokensUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const url = this.configService.get<string>('DEFIYIELD_INFO_2_URL');
    const path = this.configService.get<string>('TOKENS_PATH');

    this.tokensUrl = `${url}/${path}`;
  }

  async getAll(): Promise<Token[]> {
    try {
      const get = this.httpService.get(this.tokensUrl);
      const promise = get.toPromise();
      this.logger.time(this.tokensUrl);
      const result = await promise;
      this.logger.timeEnd(this.tokensUrl);
      const { data } = result;
      return data;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
