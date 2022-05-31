import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { LeverageBorrowingTokenDto } from '@app/common/dto/LeverageBorrowingToken.dto';
import { LeverageErcToken } from '@app/common/dto/LeverageErcToken.dto';
import { LPTokenDto } from '@app/common/dto/LpToken.dto';

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
