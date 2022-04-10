// eslint-disable-next-line max-classes-per-file
import {
  LendingPositionDto,
  LiquidityPoolFeatureDto,
  StakingPositionFeatureDto,
} from '../dto';
import { HealthFactorDto } from '../dto/HealthFactor.dto';
import { LiquidityPoolFeature } from '../dto/liquidity.pool.dto';
import { StakingProjectDto } from '../dto/transactions.dto';

import { LeverageFarmingPosition } from '../interfaces';

export type FeatureName = string;

export type Features =
  | LiquidityPoolFeatureDto
  | LendingPositionDto
  | LeverageFarmingPosition
  | StakingPositionFeatureDto
  | LiquidityPoolFeature
  | StakingProjectDto
  | HealthFactorDto;

export interface FeatureResult<T extends Features> {
  totalValue: number;
  items: T[];
}

// TODO remove StakingPosition after StakingPositionFeatureDto will be done
export type FeatureDtoType<T extends Features> = Record<FeatureName, FeatureResult<T>>;
