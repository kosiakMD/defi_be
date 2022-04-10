import { ApiProperty } from '@nestjs/swagger';

import { ERC20Token } from '../jobs/token';

export class LendingTokenDto extends ERC20Token {
  @ApiProperty({ type: Number, example: 3759.23 })
  price: number;
}
