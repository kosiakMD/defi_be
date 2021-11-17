import { ChainIdEnum, FeatureName, ProtocolName } from '@app/common';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

// todo: use this in vaults job and integration jobs controller
export interface NotifyStaking {
  chain: ChainIdEnum;
  protocolName: ProtocolName;
  featureName: FeatureName;
  items: IntegrationStakingPositionDto[];
}

export interface NotifyPools {
  chain: ChainIdEnum;
  protocolName: ProtocolName;
  featureName: FeatureName;
  items: LiquidityPoolFeature[];
}
