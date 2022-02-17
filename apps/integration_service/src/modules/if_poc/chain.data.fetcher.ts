import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { IDataFetcher } from './data.fetcher.interface';

@Injectable()
export class ChainDataFetcher implements IDataFetcher {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly multicall: MulticallAggregator,
  ) {}

  async executeCalls(calls) {
    this.logger.debug(`ChainDataFetcher: executing calls: ${calls}`);
  }
}
