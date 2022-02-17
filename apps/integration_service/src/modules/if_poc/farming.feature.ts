import { Logger } from '@app/common';

import { IFeature } from './feature.interface';

export class FarmingFeature implements IFeature {
  private featureCfg: any;
  constructor(protected readonly logger: Logger, featureCfg) {
    this.featureCfg = featureCfg;
  }

  async updateMetadata() {
    //todo implement me!
    this.logger.debug(`FarmingFeature: updateMetadata done!`);
  }
}
