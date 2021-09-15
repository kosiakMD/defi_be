import { IntegrationJob } from './dto/db.dto';
import { LiquidityPoolFeature } from './integrations.dto';

export interface LiquidityPoolJobInterface {
  chain;
  protocol;
  feature;
  isEnabled();
  setConfiguration(config: IntegrationJob);
  getTrackedLiquidityPools(): LiquidityPoolFeature[];
  updateTrackedLiquidityPools();
}
