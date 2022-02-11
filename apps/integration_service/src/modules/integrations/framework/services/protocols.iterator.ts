import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { ProtocolsConfig } from '../config/protocols.config';
import { FeatureInstructions, Instructions } from '../models';
import { InstructionsCollector } from './instructions.collector';

@Injectable()
export class ProtocolsIterator {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly instructionsCollector: InstructionsCollector,
  ) {}

  async run(): Promise<FeatureInstructions[][]> {
    const res = [];
    for (const pName of Object.keys(ProtocolsConfig)) {
      this.logger.debug('processing protocol:', pName);
      const pConfig = ProtocolsConfig[pName];
      res.push(await this.runForProtocol(pName, pConfig));
      this.logger.debug('processing finished for protocol:', pName);
    }
    return res;
  }

  async runForProtocol(pName, pConfig): Promise<FeatureInstructions[]> {
    //todo try to determine which type of protocol we are going to work with
    const { chainCode } = pConfig;
    const featureInstructions: FeatureInstructions[] = [];
    for (const chef of pConfig.chefs) {
      const { address, lpAddressFetcher } = chef;
      for (const feature of Object.keys(chef.features)) {
        this.logger.debug('processing feature:', feature);
        const { fields, processor } = chef.features[feature];
        let instructions: Instructions[];
        //TODO replace switch with better implementation
        switch (feature) {
          case 'pools':
          case 'staking':
            instructions = await this.instructionsCollector.collect(
              chainCode,
              address,
              lpAddressFetcher,
              fields,
            );
            featureInstructions.push({
              instructions,
              processor,
            });
            break;
          default:
            this.logger.warn('unsupported feature:' + feature);
            break;
        }
      }
    }
    return featureInstructions;
  }
}
