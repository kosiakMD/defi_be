import { ApiProperty } from '@nestjs/swagger';

import { TransactionBaseDto } from './transaction.base.dto';

export class TransactionAllDto extends TransactionBaseDto {
  @ApiProperty({ example: '1', type: String })
  txreceiptStatus: string;
}
