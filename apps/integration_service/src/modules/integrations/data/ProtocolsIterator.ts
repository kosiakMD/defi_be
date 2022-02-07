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
    const res = [];
    for (const pName of Object.keys(ProtocolsConfig)) {
      const pConfig = ProtocolsConfig[pName];
      res.push(await this.runForProtocol(pName, pConfig));
    }
    return res;
  }

  async runForProtocol(pName, pConfig) {
    return Promise.all(
      pConfig.chefs.map((chef) => {
        return Promise.all(
          chef.features.map((feature) => {
            switch (feature) {
              case 'pools':
                return this.poolsCollector.collect(chef.address, pConfig.chainId, chef);
              default:
                this.logger.warn('unsupported feature:' + feature);
                return Promise.resolve();
            }
          }),
        );
      }),
    );
  }
}
