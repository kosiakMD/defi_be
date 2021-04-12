import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
import { Address, BaseData } from '../common/interfaces';

@Injectable()
export class IntegrationService {
  private readonly uniswapUrl;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('INTEGRATION_SERVICE_HOST');
    const port = this.configService.get<string>('INTEGRATION_SERVICE_PORT');

    const uniswapPath = this.configService.get<string>('INTEGRATION_UNISWAP');

    this.uniswapUrl = `${host}:${port}/${uniswapPath}`;
  }

  async getUniswap(address: Address): Promise<BaseData[]> {
    try {
      const get = this.httpService.get(this.uniswapUrl, { params: { address } });
      const promise = get.toPromise();
      this.logger.time(this.uniswapUrl);
      const result = await promise;
      this.logger.timeEnd(this.uniswapUrl);
      const { data } = result;
      return data;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
