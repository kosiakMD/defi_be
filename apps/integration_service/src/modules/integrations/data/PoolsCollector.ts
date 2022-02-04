import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from '../../../../../../jobs/lambda_vaults/src/logger/logger.service';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

@Injectable()
export class PoolsCollector {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly multicall: MulticallAggregator,
  ) {}

  async collect(chefAddress: string) {
    //todo execute poolLength via multicall
    //todo fetch ABI
    //todo iterate over pools and generate poolInfo calls ?
  }
}
