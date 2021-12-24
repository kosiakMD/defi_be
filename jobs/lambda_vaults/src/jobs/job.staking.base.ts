import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';

import { JobBase } from './job.base';

export abstract class JobStakingBase<T extends NotifySupportedFeature> extends JobBase<T> {
  //
}
