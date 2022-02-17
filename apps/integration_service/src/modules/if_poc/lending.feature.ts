import { Logger } from '@app/common';

import { IFeature } from './feature.interface';

export class LendingFeature implements IFeature {
  private featureCfg: any;
  constructor(protected readonly logger: Logger, featureCfg) {
    this.featureCfg = featureCfg;
  }

  async updateMetadata() {
    //todo implement me!
    this.logger.debug(`LendingFeature: updateMetadata done!`);
  }
}
