import { ApiProperty } from '@nestjs/swagger';

// TODO: Why it's imported from here
import { ERC20Token } from '../jobs/token';

export class StakingErcToken extends ERC20Token {
  @ApiProperty({ type: Number, example: 3759.23 })
  price?: number = null;

  @ApiProperty({ type: Number, example: 1.2512 })
  value?: number;

  @ApiProperty({ type: String, example: '123.6534' })
  balance?: string;
}
