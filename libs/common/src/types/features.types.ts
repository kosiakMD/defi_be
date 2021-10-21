import {
  StakingPositionFeatureDto,
  LiquidityPoolFeatureDto,
  LendingPositionDto,
} from '@app/common/dto';

import { LeverageFarmingPosition, StakingPosition } from '../interfaces';

export type FeatureName = string;

export type Features =
  | LiquidityPoolFeatureDto
  | LendingPositionDto
  | LeverageFarmingPosition
  | StakingPositionFeatureDto
  | StakingPosition;

export interface FeatureResult<T extends Features> {
  totalValue: number;
  items: T[];
}

// TODO remove StakingPosition after StakingPositionFeatureDto will be done
export type FeatureDto<T extends Features> = Record<FeatureName, FeatureResult<T>>;

export class FeatureResultDto<T extends Features> {
  totalValue = 0;
  items: T[] = [];
  errors?: string[] = [];
}
