import { ApiProperty } from '@nestjs/swagger';

import { ParsedTransfers, SubTransactions } from '../transactions.parsing.interfaces';

export class ParsedTransfersDto implements ParsedTransfers {
  @ApiProperty({ type: String })
  address?: string;
  @ApiProperty({ type: Number })
  gas: number;
  @ApiProperty({ type: String })
  gasPrice: string;
  @ApiProperty({ type: String })
  hash: string;
  @ApiProperty({ type: String })
  name: string;
  @ApiProperty({ type: Array })
  subTransactions?: SubTransactions[];
}
