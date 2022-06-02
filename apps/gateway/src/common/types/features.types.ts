import { StakingPositionDto } from '../DTO/StakingPosition.dto';
import { LiquidityPoolFeature } from '../DTO/integrations.dto';
import { StakingPosition } from '../interfaces';

export type FeatureName = string;

// TODO remove StakingPosition asfter StakingPositionFeatureDto will be done
export type FeatureDto<T = LiquidityPoolFeature | StakingPositionDto | StakingPosition> = Record<
  FeatureName,
  FeatureResult<T>
>;

export interface FeatureResult<T = FeatureDto> {
  totalValue: number;
  items: T[];
}
