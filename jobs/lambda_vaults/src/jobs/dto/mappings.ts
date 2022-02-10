// eslint-disable-next-line max-classes-per-file
import { plainToClass } from 'class-transformer';

import { IntegrationClaimableTokenDto } from '@app/common/jobs/staking';

export class FeatureMappingDbItem {
  dbId: number;
  dtoName: string;
}

export class FeatureMappingPoolToken extends FeatureMappingDbItem {
  tokens?: FeatureMappingStakingPoolToken[];
  positionInPool: number;
  weight?: number = null;
}

export class FeatureMappingStakingPoolToken extends FeatureMappingDbItem {
  positionInPool: number;
  tokens?: FeatureMappingStakingPoolToken[];
}

export class FeatureMappingStakingToken extends FeatureMappingDbItem {
  dbId: number;
  dtoName: string;
  tokens?: FeatureMappingStakingPoolToken[];
}

export class PoolsFeatureMapping {
  dbId: number;
  dtoName: string;
  lpToken: FeatureMappingDbItem;
  tokens?: FeatureMappingPoolToken[];
  rewards?: IntegrationClaimableTokenDto[] = [plainToClass(IntegrationClaimableTokenDto, {})];
}

export class StakingFeatureMapping {
  dbId: number;
  dtoName: string;
  rewards: FeatureMappingDbItem[];
  stakingToken: FeatureMappingStakingToken;
}
