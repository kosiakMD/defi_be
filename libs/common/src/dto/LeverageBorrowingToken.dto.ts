import { ApiProperty } from '@nestjs/swagger';

import { ERC20Token } from '@app/common/dto/ERC20Token';

export class LeverageBorrowingTokenDto extends ERC20Token {
  @ApiProperty()
  price: number;

  @ApiProperty()
  balance: string;

  @ApiProperty()
  value: number;
}
