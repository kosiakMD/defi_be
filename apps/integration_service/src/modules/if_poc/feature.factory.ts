import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { FarmingFeature } from './farming.feature';
import { IFeature } from './feature.interface';
import { LendingFeature } from './lending.feature';

@Injectable()
export class FeatureFactory {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger) {}

  createFeature(featureName, featureCfg): IFeature {
    this.logger.debug(`createFeature: ${featureName}`);
    switch (featureName) {
      case 'farming':
        return new FarmingFeature(this.logger, featureCfg);
      case 'lending':
        return new LendingFeature(this.logger, featureCfg);
      default:
        this.logger.warn('unsupported feature', featureName);
        throw Error('unsupported feature');
    }
  }
}
