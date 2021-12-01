import { ApiProperty } from '@nestjs/swagger';

import { PoolTokenDto } from '@app/common/dto/integrations.dto';
import { ERC20Token } from '@app/common/jobs/token';

export class LeverageErcToken extends ERC20Token {
  @ApiProperty({ type: Number, example: 3759.23 })
  price?: number = null;

  @ApiProperty({ type: Number, example: 1.2512 })
  value?: number = null;

  @ApiProperty({ type: String, example: '123.6534' })
  balance?: string = null;

  @ApiProperty({ type: [PoolTokenDto] })
  tokens?: PoolTokenDto[] = [];
}
