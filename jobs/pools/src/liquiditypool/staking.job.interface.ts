import { IntegrationJob } from './dto/db.dto';
import { StakingPoolFeature } from './integrations.dto';

export interface StakingJobInterface {
  chain;
  protocol;
  feature;
  placeholder;
  isEnabled();
  setConfiguration(config: IntegrationJob);
  getTrackedStakingPools(): StakingPoolFeature[];
  updateWithExternalData(): Promise<StakingPoolFeature[]>;
  updateTrackedStakingPools();
}
