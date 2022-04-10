import { ApiProperty } from '@nestjs/swagger';

import { PoolToken } from '../interfaces';
import { ClaimAbleTokenDto } from './ClaimableToken.dto';
import { ERC20Token } from './ERC20Token';
import { ERC20TokenDto } from './ERC20Token.dto';
import { PoolTokenDto } from './integrations.dto';

export class StakingPositionFeatureDto {
  @ApiProperty({ type: String, example: '0xa57bd00134b2850b2a1c55860c9e9ea100fdd6cf' })
  address: string;

  @ApiProperty({ type: String, example: '642354' })
  staked: string;

  @ApiProperty({ type: ERC20TokenDto })
  lpToken: ERC20Token;

  @ApiProperty({ type: ClaimAbleTokenDto })
  rewardToken: any;

  @ApiProperty({ type: [PoolTokenDto] })
  liquidityPoolTokens: PoolToken[];

  @ApiProperty({ type: String, example: '10', required: false })
  poolId?: string;
}
