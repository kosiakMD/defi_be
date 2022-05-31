import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { LeverageBorrowingTokenDto } from '@app/common/dto/leverage-borrowing-token.dto';
import { LeverageErcToken } from '@app/common/dto/leverage-erc-token.dto';
import { LPTokenDto } from '@app/common/dto/lp-token.dto';

export class LeverageFarmingPositionDto {
  @ApiProperty({ type: String, example: '0x60dE7F647dF2448eF17b9E0123411724De6e373D' })
  address: string;
  @ApiProperty({ type: LeverageBorrowingTokenDto })
  borrowToken: LeverageBorrowingTokenDto;
  @ApiProperty({ type: Number, example: 75.1 })
  debtRatio: number;
  @ApiProperty({ type: String, example: 144.2 })
  earned: number;
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(LPTokenDto) }, { $ref: getSchemaPath(LeverageErcToken) }],
  })
  farmToken: LPTokenDto | LeverageErcToken;
}
