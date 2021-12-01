import { ChainIdEnum, FeatureName, ProtocolName } from '@app/common';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

// todo: use this in vaults job and integration jobs controller

export type NotifySupportedFeature = IntegrationStakingPositionDto | LiquidityPoolFeature;
export interface NotifyBase<T extends NotifySupportedFeature> {
  chain: ChainIdEnum;
  protocolName: ProtocolName;
  featureName: FeatureName;
  items: T[];
}

export interface NotifyStaking extends NotifyBase<IntegrationStakingPositionDto> {
  items: IntegrationStakingPositionDto[];
}

export interface NotifyPools extends NotifyBase<LiquidityPoolFeature> {
  items: LiquidityPoolFeature[];
}
