import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { ProtocolsConfig } from './config/protocols.config';
import { PoolsCollector } from './pools.collector';

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
    //todo try to determine which type of protocol we are going to work with
    return Promise.all(
      pConfig.chefs.map((chef) => {
        return Promise.all(
          chef.features.map((feature) => {
            switch (feature) {
              case 'pools':
                return this.poolsCollector.collect(chef.address, pConfig.chainCode, chef);
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
