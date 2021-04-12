import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
import { Vault } from '../common/interfaces';

@Injectable()
export class VaultsService {
  private readonly vaultsUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const url = this.configService.get<string>('VAULTS_SERVICE_URL');
    const path = this.configService.get<string>('VAULTS_PATH');

    this.vaultsUrl = `${url}/${path}`;
  }

  async getAll(): Promise<Vault[][]> {
    try {
      const get = this.httpService.get(this.vaultsUrl);
      const promise = get.toPromise();
      this.logger.time(this.vaultsUrl);
      const result = await promise;
      this.logger.timeEnd(this.vaultsUrl);
      const { data } = result;
      return data;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
