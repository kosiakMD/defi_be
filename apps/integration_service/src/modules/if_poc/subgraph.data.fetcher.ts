import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { IDataFetcher } from './data.fetcher.interface';

@Injectable()
export class SubgraphDataFetcher implements IDataFetcher {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger) {}

  async executeCalls(calls) {
    this.logger.debug(`SubgraphDataFetcher: executing calls: ${calls}`);
  }
}
