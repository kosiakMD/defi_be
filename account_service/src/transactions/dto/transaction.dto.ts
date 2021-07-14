import { ApiProperty } from '@nestjs/swagger';

import { TransactionBaseDto } from './transaction.base.dto';

export class TransactionDto extends TransactionBaseDto {
  @ApiProperty({ example: '1', type: String })
  txreceipt_status: string; // eslint-disable-line camelcase

  @ApiProperty({ example: 0.06434159067634895, type: Number })
  feeUSD: number;

  @ApiProperty({ example: 232.11252047744935, type: Number })
  coinPriceUSD: number;

  @ApiProperty({ example: 98.4953143821957, type: Number })
  valueUSD: number;

  @ApiProperty({ example: false, type: Boolean, required: false })
  isInternal?: boolean;

  constructor(transaction: Partial<TransactionDto>) {
    super();
    Object.assign(this, transaction);
  }
}
