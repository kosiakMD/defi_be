import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '../config/enum';
import { LiquidityPoolFeature, StakingPoolFeature } from './integrations.dto';

@Injectable()
export class FeaturesExtracted {
  private poolsFeatures: Map<ChainIdEnum, Map<string, LiquidityPoolFeature>>;
  private stakingFeatures: Map<ChainIdEnum, Map<string, StakingPoolFeature>>;

  constructor() {
    this.poolsFeatures = new Map<ChainIdEnum, Map<string, LiquidityPoolFeature>>();
    this.stakingFeatures = new Map<ChainIdEnum, Map<string, StakingPoolFeature>>();
  }

  getPoolFeatures(): Map<ChainIdEnum, Map<string, LiquidityPoolFeature>> {
    return this.poolsFeatures;
  }

  setPoolsFeatures(pools: Map<ChainIdEnum, Map<string, LiquidityPoolFeature>>): void {
    this.poolsFeatures = pools;
  }

  getStakingFeatures(): Map<ChainIdEnum, Map<string, StakingPoolFeature>> {
    return this.stakingFeatures;
  }

  setStakingFeatures(stakings: Map<ChainIdEnum, Map<string, StakingPoolFeature>>): void {
    this.stakingFeatures = stakings;
  }
}
