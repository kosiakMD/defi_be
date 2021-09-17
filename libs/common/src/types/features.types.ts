import { StakingPositionDto } from '../dto/StakingPosition.dto';
import { LiquidityPoolFeature } from '../dto/integrations.dto';
import { StakingPosition } from '../interfaces';

export type FeatureName = string;

// TODO remove StakingPosition asfter StakingPositionDto will be done
export type FeatureDto<T = LiquidityPoolFeature | StakingPositionDto | StakingPosition> = Record<
  FeatureName,
  FeatureResult<T>
>;

export interface FeatureResult<T = FeatureDto> {
  totalValue: number;
  items: T[];
}
