import { StakingErcToken } from '@app/common/dto/StakingErcToken';
import { ApiProperty } from '@nestjs/swagger';

import { PoolTokenDto } from '@app/common';

export class LPTokenDto extends StakingErcToken {
  @ApiProperty({ type: [PoolTokenDto] })
  tokens: PoolTokenDto[] = [];
}
