import { ApiProperty } from '@nestjs/swagger';

import { ERC20Token } from '@app/common/jobs/token';

export class LeverageBorrowingTokenDto extends ERC20Token {
  @ApiProperty()
  price: number;

  @ApiProperty()
  balance: string;

  @ApiProperty()
  value: number;
}
