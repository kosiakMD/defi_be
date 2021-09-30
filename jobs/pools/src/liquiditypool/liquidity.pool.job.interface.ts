import { IntegrationJob } from './dto/db.dto';
import { LiquidityPoolFeature } from './integrations.dto';

export interface LiquidityPoolJobInterface {
  chain;
  protocol;
  feature;
  placeholder;
  isEnabled();
  setConfiguration(config: IntegrationJob);
  getTrackedLiquidityPools(): LiquidityPoolFeature[];
  updateTrackedLiquidityPools();
}
