import { ApiProperty } from '@nestjs/swagger';

import { SubTransactions } from '../transactions.parsing.interfaces';

export class SubTransactionDto implements SubTransactions {
  @ApiProperty({ type: String })
  address: string;
  @ApiProperty({ type: String })
  amount: string;
  @ApiProperty({ type: String })
  symbol: string;
  @ApiProperty({ type: Number })
  decimals: number;
  @ApiProperty({ type: String })
  from?: string;
  @ApiProperty({ type: String })
  to?: string;
  @ApiProperty({ type: String })
  type: string;
  @ApiProperty({ type: String })
  tokenAddress?: string;
  @ApiProperty({ type: Number })
  price?: number;
  @ApiProperty({ type: Number })
  chainId?: number;
}
