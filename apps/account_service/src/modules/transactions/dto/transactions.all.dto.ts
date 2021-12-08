import { ApiProperty } from '@nestjs/swagger';

import { TransactionsBaseDto } from './transactions.base.dto';

export class TransactionsAllDto extends TransactionsBaseDto {
  @ApiProperty({ example: '1', type: String })
  txreceiptStatus: string;
}
