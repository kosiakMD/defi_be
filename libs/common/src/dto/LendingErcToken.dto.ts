import { Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { ERC20Token } from './ERC20Token';

export class LendingErcToken extends ERC20Token {
  @ApiProperty({ type: Number, example: 3759.23 })
  @Expose()
  price: number;
  @Expose()
  tokens?: LendingErcToken[];
}
