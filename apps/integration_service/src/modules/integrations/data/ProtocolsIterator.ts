import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../../../../../../jobs/lambda_vaults/src/logger/logger.service';
import { PoolsCollector } from './PoolsCollector';
import { ProtocolsConfig } from './protocols.config';

@Injectable()
export class ProtocolsIterator {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly poolsCollector: PoolsCollector,
  ) {}

  async run() {
    return Object.keys(ProtocolsConfig).reduce(async (promise, pName) => {
      await promise;
      const pConfig = ProtocolsConfig[pName];
      return this.runForProtocol(pName, pConfig);
    }, Promise.resolve());
  }

  async runForProtocol(pName, pConfig) {
    return pConfig.chefs.map((chef) => {
      return chef.features.map((feature) => {
        switch (feature) {
          case 'pools':
            return this.poolsCollector.collect(chef.address);
          default:
            this.logger.warn('unsupported feature:' + feature);
            return Promise.resolve();
        }
      });
    });
  }
}
