import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { getChainById } from '@app/common/utils';

import { Logger } from '../logger/logger.service';
import { IntegrationService } from '../microservices/integration.service';

@Injectable()
export class JobsV3Runner {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly integrationService: IntegrationService,
  ) {}

  async update() {
    const v3ProtocolsData = await this.integrationService.getV3Protocols();
    const protocols = v3ProtocolsData.data;
    const chainsProtocols: {
      // key is ChainId
      [key: string]: string[];
    } = {};
    protocols.forEach((p) => {
      p.features.forEach((f) => {
        if (!chainsProtocols[f.chain.id]) {
          chainsProtocols[f.chain.id.toString()] = [];
        }
        chainsProtocols[f.chain.id.toString()].push(p.project);
      });
    });

    const promises = Object.entries(chainsProtocols).map(async ([chain, cProtocols]) => {
      const result = [];
      for (const protocol of cProtocols as string[]) {
        try {
          this.logger.log(
            `Caching opportunities for ${protocol} and ${getChainById(Number(chain)).name} chain`,
            this.constructor.name,
          );
          const response = await this.integrationService.syncV3ProtocolData(protocol, [
            Number(chain),
          ]);
          this.logger.log(
            `Result for ${protocol} and ${getChainById(Number(chain)).name} chain: ` +
              ` count [${response.data.count ? response.data.count : 'undefined'}],` +
              ` errors [${response.data.errors ? response.data.errors.join('|') : 'none'}]` +
              ` time [${response.timeExecute ? response.timeExecute : 'undefined'}]`,
            this.constructor.name,
          );
        } catch (e) {
          this.logger.log(
            `Error caching opportunities for ${protocol}` +
              ` and ${getChainById(Number(chain)).name} chain`,
            this.constructor.name,
          );
        }
      }
      return {
        chain: getChainById(Number(chain)),
        results: result,
      };
    });
    await Promise.all(promises);
  }
}
