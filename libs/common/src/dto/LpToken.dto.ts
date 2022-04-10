import { ApiProperty } from '@nestjs/swagger';

import { StakingErcToken } from './StakingErcToken';
import { PoolTokenDto } from "./liquidity.pool.dto";

export class LPTokenDto extends StakingErcToken {
  @ApiProperty({ type: [PoolTokenDto] })
  tokens: PoolTokenDto[] = [];
}
