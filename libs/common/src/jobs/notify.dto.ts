import { ChainIdEnum } from '../enum';
import { LiquidityPoolFeature } from './pools';
import { IntegrationStakingPositionDto } from './staking';
import { FeatureName, ProtocolName } from '../types';

// todo: use this in vaults job and integration jobs controller

export type NotifySupportedFeature = IntegrationStakingPositionDto | LiquidityPoolFeature;
export interface NotifyBase<T extends NotifySupportedFeature = NotifySupportedFeature> {
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
