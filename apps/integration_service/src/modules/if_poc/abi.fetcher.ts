import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { Abis } from './abis';

@Injectable()
export class AbiFetcher {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  async fetchAbi(cfg: any) {
    this.logger.debug('fetch abi for ' + cfg.address);
    //todo implement fetching of ABI for the address
    return Abis;
  }
}
