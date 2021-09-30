import { ChainIdEnum } from '../config/enum';
import { IntegrationJob } from './dto/db.dto';
import { LiquidityPoolFeature } from './integrations.dto';
import { LiquidityPoolJobInterface } from './liquidity.pool.job.interface';

export abstract class LiquidityPoolJobAbstract implements LiquidityPoolJobInterface {
  public chain: ChainIdEnum;
  public protocol: string;
  public feature: string;
  public placeholder: string;

  protected isConfigurationSet = false;
  protected configuration: IntegrationJob = null;

  setConfiguration(config: IntegrationJob): void {
    if (this.isConfigurationSet) {
      throw new Error(`configuration is already set for [${this.placeholder}]`);
    }
    this.configuration = config;
    this.isConfigurationSet = true;
  }

  isEnabled(): boolean {
    if (!this.isConfigurationSet) {
      throw new Error(`configuration is not set for [${this.placeholder}]`);
    }
    return this.configuration ? this.configuration.isEnabled : false;
  }

  getTrackedLiquidityPools(): LiquidityPoolFeature[] {
    if (!this.isConfigurationSet) {
      throw new Error(`configuration is not set for [${this.placeholder}]`);
    }
    return this.configuration.settings as LiquidityPoolFeature[];
  }

  abstract updateTrackedLiquidityPools();
}
