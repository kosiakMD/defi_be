import { Transaction } from 'src/interfaces/transactions.interfaces';

import { ApiProperty } from '@nestjs/swagger';

import { TransactionTypeEnum } from 'src/common/enum';

export class TransactionDto<T = string> implements Transaction<T> {
  @ApiProperty({ enum: TransactionTypeEnum, enumName: 'TransactionTypeEnum' })
  type: T;

  @ApiProperty({
    type: String,
    example: '0x9f5a1db3de71c984283b396af6ac13a6d805949a9c82fb60d033e538790e8b79',
  })
  hash: string;

  @ApiProperty({ type: Number, example: 1627300491351 })
  timestamp: number;

  @ApiProperty({ type: Number, example: 12900454 })
  blockNumber: number;

  @ApiProperty({ type: Number, example: 141.576, required: false })
  gasUsed?: number;

  @ApiProperty({ type: Number, example: 29, required: false })
  gasPrice?: number;

  @ApiProperty({ type: Number, example: 4105.704, required: false })
  gasPriceUsd?: number;
}
