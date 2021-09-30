import { Expose } from 'class-transformer';

import { ChainIdEnum } from '../../config/enum';
import { LiquidityPoolFeature, StakingPoolFeature } from '../integrations.dto';

export class IntegrationJob {
  id: string;
  @Expose({ name: 'is_enabled' })
  isEnabled: boolean;
  @Expose({ name: 'chain_id' })
  chainId: ChainIdEnum;
  feature: string;
  protocol: string;
  settings: LiquidityPoolFeature[] | StakingPoolFeature[];
  @Expose({ name: 'update_frequency' })
  updateFrequency: number;
  @Expose({ name: 'created_at' })
  createdAt: Date;
  @Expose({ name: 'updated_at' })
  updatedAt: Date;
}
