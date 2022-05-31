import { ApiProperty } from '@nestjs/swagger';

import { ERC20Token, ERC20TokenDto, PoolToken, PoolTokenDto } from '@app/common';

import { ClaimableTokenDto } from './claimable-token.dto';

export class StakingPositionFeatureDto {
  @ApiProperty({ type: String, example: '0xa57bd00134b2850b2a1c55860c9e9ea100fdd6cf' })
  address: string;

  @ApiProperty({ type: String, example: '642354' })
  staked: string;

  @ApiProperty({ type: ERC20TokenDto })
  lpToken: ERC20Token;

  @ApiProperty({ type: ClaimableTokenDto })
  rewardToken: any;

  @ApiProperty({ type: [PoolTokenDto] })
  liquidityPoolTokens: PoolToken[];

  @ApiProperty({ type: String, example: '10', required: false })
  poolId?: string;
}
