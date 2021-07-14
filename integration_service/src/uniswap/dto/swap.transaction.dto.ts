import { ApiProperty } from '@nestjs/swagger';

import { SwapTokenDto } from './swap.token.dto';

enum SwapTransactionType {
  'swap' = 'swap',
}

export class SwapTransactionDto {
  @ApiProperty({
    enum: SwapTransactionType,
    enumName: 'SwapTransactionType',
    example: SwapTransactionType.swap,
  })
  type: SwapTransactionType.swap;

  @ApiProperty({ type: SwapTokenDto })
  tokenIn: SwapTokenDto;

  @ApiProperty({ type: SwapTokenDto })
  tokenOut: SwapTokenDto;
}
