import { ApiProperty } from '@nestjs/swagger';

import { SwapTokenDto } from './swap.token.dto';
import { EnumName } from 'src/common/enum';

enum SwapTransactionType {
  swap = 'swap',
}

export class SwapTransactionDto {
  @ApiProperty({
    enum: SwapTransactionType,
    enumName: EnumName.SwapTransactionType,
    example: SwapTransactionType.swap,
  })
  type: SwapTransactionType.swap;

  @ApiProperty({ type: SwapTokenDto })
  tokenIn: SwapTokenDto;

  @ApiProperty({ type: SwapTokenDto })
  tokenOut: SwapTokenDto;
}
