// eslint-disable-next-line max-classes-per-file
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { LPToken } from '../../../../../common/dto';
import { BorrowToken, ERC20Token } from '../../../../../common/interfaces/transactions.interfaces';

import { LeverageFarmingPosition } from '../interfaces/leverage.farming.interfaces';

export class LeverageErcToken extends ERC20Token {
  @ApiProperty({ type: Number, example: 3759.23 })
  price?: number = null;

  @ApiProperty({ type: Number, example: 1.2512 })
  value?: number = null;

  @ApiProperty({ type: String, example: '123.6534' })
  balance?: string = null;
}

export class LeverageFarmingPositionDto implements LeverageFarmingPosition {
  @ApiProperty({ type: String, example: '0x60dE7F647dF2448eF17b9E0123411724De6e373D' })
  address: string;
  @ApiProperty({ type: BorrowToken })
  borrowToken: BorrowToken;
  @ApiProperty({ type: Number, example: 75.1 })
  debtRatio: number;
  @ApiProperty({ type: String, example: 144.2 })
  earned: number;
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(LPToken) }, { $ref: getSchemaPath(LeverageErcToken) }],
  })
  farmToken: LPToken | LeverageErcToken;
}
