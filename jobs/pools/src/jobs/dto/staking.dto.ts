// todo: this dto is from integration service, need to optimise import
// eslint-disable-next-line max-classes-per-file
import { plainToClass } from 'class-transformer';
import { ERC20Token } from './common';
import BigNumber from 'bignumber.js';

export class ClaimableDto {
  balance: string = null;
  value: number = null;
}

export class IntegrationPoolTokenDto extends ERC20Token {
  reserve: number = null;
  value: number = null;
  balance: number = null;
  price: number = null;
  positionInPool: number = null;
}

export class IntegrationERC20TokenDto extends ERC20Token {
  price?: number = null;
  value?: number = null;
  balance?: number = null;
  tokens?: IntegrationPoolTokenDto[] = [];
}

export class IntegrationClaimableTokenDto extends ERC20Token {
  claimableData?: ClaimableDto = plainToClass(ClaimableDto, {});
  price?: number = null;
}

export class Stats {
  apy: number = null;
  apr: number[] = [];
  tvl: number = null;
}

export class IntegrationStakingPositionDto {
  address: string = null;
  poolId: number = null;
  poolName: string = null;
  staked: number = null;
  stats: Stats = plainToClass(Stats, {});
  stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {});
  rewards: IntegrationClaimableTokenDto[] = [plainToClass(IntegrationClaimableTokenDto, {})];
}

export class IntegrationStakingPositionDto1 {
  address: string = null;
  poolId: number = null;
  poolName: string = null;
  staked: number = null;
  stats: Stats = plainToClass(Stats, {});
  stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {});
  rewardToken: IntegrationClaimableTokenDto = plainToClass(IntegrationClaimableTokenDto, {});
}

export class APRStats {
  totalAllocPoints: BigNumber;
  poolAllocPoints: BigNumber;
  rewardTokenPerBlock: number;
  rewardTokenPrice: number;
  blockTime: number;
  farmingPoolTVL: number;
}

export class APRStatsBonus {
  rewardTokenPerBlock: number;
  rewardTokenPrice: number;
  blockTime: number;
  farmingPoolTVL: number;
}

export class StakingFeatureMapping {
  dbId: number;
  dtoName: string;
  rewards: {
    dbId: number;
    dtoName: string;
  }[];
  stakingToken: {
    dbId: number;
    dtoName: string;
    tokens?: {
      dbId: number;
      dtoName: string;
      positionInPool: number;
    }[];
  };
}