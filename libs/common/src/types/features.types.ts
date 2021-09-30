import { StakingPositionFeatureDto } from '@app/common/dto';
import { LiquidityPoolFeatureDto } from '@app/common/dto';

import { StakingPosition } from '../interfaces';

export type FeatureName = string;

// TODO remove StakingPosition asfter StakingPositionFeatureDto will be done
export type FeatureDto<T = LiquidityPoolFeatureDto | StakingPositionFeatureDto | StakingPosition> =
  Record<FeatureName, FeatureResult<T>>;

export interface FeatureResult<T = FeatureDto> {
  totalValue: number;
  items: T[];
}

export class FeatureResultDto<T = FeatureDto> {
  totalValue = 0;
  items: T[] = [];
}
