import { ApiProperty } from '@nestjs/swagger';
import { SwapTokenDto } from 'src/uniswap/dto/swap.token.dto';

export class TransferTransactionDto {
  @ApiProperty({ enum: ['transfer'] })
  type: 'transfer';

  @ApiProperty({ enum: ['in', 'out'] })
  direction: 'in' | 'out';

  @ApiProperty({ type: [SwapTokenDto] })
  token: SwapTokenDto[];
}
