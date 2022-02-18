import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { FarmingFeature } from './farming.feature';
import { IFeature } from './feature.interface';

@Injectable()
export class FeatureFactory {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly multicall: MulticallAggregator,
  ) {}

  createFeature(featureName): IFeature {
    this.logger.debug(`createFeature: ${featureName}`);
    switch (featureName) {
      case 'MasterChefFarming':
        return new FarmingFeature(this.logger, this.multicall);
      default:
        this.logger.warn('unsupported feature', featureName);
        throw Error('unsupported feature');
    }
  }
}
