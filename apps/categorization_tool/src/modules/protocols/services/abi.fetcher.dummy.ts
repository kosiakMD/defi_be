import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { IAbiFetcher } from './abi.fetcher.interface';

@Injectable()
export class AbiFetcherDummy implements IAbiFetcher {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger) {}

  async fetchAbiAndAbiCode(address: string): Promise<{ abi: string; abiCode: string }> {
    this.logger.warn(`AbiFetcherDummy: fetchAbiAndAbiCode for address: ${address} not supported`);
    return { abi: null, abiCode: null };
  }
}
