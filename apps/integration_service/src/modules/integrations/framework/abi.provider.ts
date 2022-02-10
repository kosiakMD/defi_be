import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { Abis } from './abis';

@Injectable()
export class AbiProvider {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  async getAbi(address: string) {
    this.logger.debug('abi for ' + address);
    //todo implement fetching of ABI for the address
    return Abis;
  }
}
