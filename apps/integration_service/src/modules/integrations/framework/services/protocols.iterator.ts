import * as _ from 'lodash';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { ProtocolsConfig } from '../config/protocols.config';
import { TemplatesConfig } from '../config/templates.config';
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
      this.logger.debug(`processing protocol: ${pName}`);
      const pConfig = ProtocolsConfig[pName];
      res.push(await this.runForProtocol(pName, pConfig));
      this.logger.debug(`processing finished for protocol: ${pName}`);
    }
    return res;
  }

  async runForProtocol(pName, pConfig): Promise<FeatureInstructions[]> {
    const { chainCode } = pConfig;
    const featureInstructions: FeatureInstructions[] = [];
    for (const contract of pConfig.contracts) {
      if (!this.contractTypeSupported(contract.type)) {
        this.logger.warn(`unsupported type of contract: ${contract.type}`);
        continue;
      }
      const { address, lpAddressFetcher = 'poolInfo' } = contract;
      for (const feature of Object.keys(contract.features)) {
        this.logger.debug(`processing feature: ${feature}`);
        if (contract.features[feature].template) {
          contract.features[feature].template = _.merge(
            contract.features[feature],
            TemplatesConfig[contract.features[feature].template],
          );
        }
        const { fields, processor } = contract.features[feature];
        let instructions: Instructions[];
        //TODO replace switch with better implementation, probably make collector configurable
        switch (feature) {
          case 'pools':
          case 'farming':
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
            this.logger.warn(`unsupported feature: ${feature}`);
            break;
        }
      }
    }
    return featureInstructions;
  }

  contractTypeSupported(contractType: string): boolean {
    return ['MASTER_CHEF'].includes(contractType);
  }
}
