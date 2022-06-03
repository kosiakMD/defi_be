import {
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
  UnderlyingStakingLp,
} from '@app/common/jobs/staking';

export interface StakingDataInterface {
  stakingBalance: number;
  stakingPosition: IntegrationStakingPositionDto;
  claimableReward?: [{ rewardToken: string; rewardValue: string }];
}

export type UnderlyingTokenDto = IntegrationPoolTokenDto | UnderlyingStakingLp;
