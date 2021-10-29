// todo: this dto is from integration service, need to optimise import
// eslint-disable-next-line max-classes-per-file
import { plainToClass } from 'class-transformer';

export class ClaimableDto {
  balance: string = null;
  value: number = null;
}

export class ERC20Token {
  address: string = null;
  name: string = null;
  symbol: string = null;
  decimals: number = null;
  totalSupply: number = null;
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
  apr: number = null;
  tvl: number = null;
}

export class IntegrationStakingPositionDto {
  address: string = null;
  poolId: number = null;
  poolName: string = null;
  staked: number = null;
  stats: Stats = plainToClass(Stats, {});
  stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {});
  rewardToken: IntegrationClaimableTokenDto = plainToClass(IntegrationClaimableTokenDto, {});
}
