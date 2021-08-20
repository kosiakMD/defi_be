import {
  ClaimAbleToken,
  ERC20Token,
  PoolToken,
  Transaction,
} from 'src/interfaces/transactions.interfaces';

import { ApiProperty } from '@nestjs/swagger';

import { ClaimAbleTokenDto } from './claimable.token.dto';
import { ERC20TokenDto } from './erc20.token.dto';
import { PoolTokenDto } from './pool.token.dto';
import { TransactionDto } from './transaction.dto';

export class StakingPositionDto {
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
