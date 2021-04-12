import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
import { Address, ContractApproval } from '../common/interfaces';

@Injectable()
export class ApprovalsService {
  private readonly gasUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const url = this.configService.get<string>('DEFIYIELD_INFO_MAIN_URL');
    const path = this.configService.get<string>('APPROVALS_PATH');

    this.gasUrl = `${url}/${path}`;
  }

  async getAll(address: Address): Promise<ContractApproval[]> {
    try {
      const get = this.httpService.get(`${this.gasUrl}/${address}`);
      const promise = get.toPromise();
      this.logger.time(this.gasUrl);
      const result = await promise;
      this.logger.timeEnd(this.gasUrl);
      const { data } = result;
      return data;
    } catch (e) {
      this.logger.error('er', e.message);
      throw e;
    }
  }
}
