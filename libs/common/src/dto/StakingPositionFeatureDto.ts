import { ApiProperty } from '@nestjs/swagger';

import { ClaimAbleToken, ERC20Token, PoolToken, PoolTokenDto, Transaction } from '@app/common';
import { ERC20TokenDto } from '@app/common';

import { ClaimAbleTokenDto } from './ClaimableToken.dto';
// import PoolTokenDto from './PoolToken.dto';
import { TransactionDto } from './Transaction.dto';

export class StakingPositionFeatureDto {
  @ApiProperty({ type: String, example: '0xa57bd00134b2850b2a1c55860c9e9ea100fdd6cf' })
  address: string;

  @ApiProperty({ type: String, example: '642354' })
  staked: string;

  @ApiProperty({ type: ERC20TokenDto })
  lpToken: ERC20Token;

  @ApiProperty({ type: ClaimAbleTokenDto })
  rewardToken: ClaimAbleToken;

  @ApiProperty({ type: [PoolTokenDto] })
  liquidityPoolTokens: PoolToken[];

  @ApiProperty({ type: [TransactionDto], required: false })
  transactions?: Transaction[];

  @ApiProperty({ type: String, example: '10', required: false })
  poolId?: string;
}
