import { ApiProperty } from '@nestjs/swagger';

import { PoolTokenDto } from '@app/common';
import { StakingErcToken } from '@app/common/dto/transactions.dto';

export class LPTokenDto extends StakingErcToken {
  @ApiProperty({ type: [PoolTokenDto] })
  tokens: PoolTokenDto[] = [];
}
