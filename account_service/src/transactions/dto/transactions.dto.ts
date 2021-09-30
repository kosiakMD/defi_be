// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { DetailedResponseDto } from 'src/common/dto';
import { ResultStatus } from 'src/common/enum';
import { Address, DetailedResponse } from 'src/common/interfaces';

import { SubTransactionTypEnum } from '../transactions.enum';
import { TransactionDto as TransactionFromScanDto, TransactionNewDto } from './transaction.dto';

export interface TransactionsDetailedResponse extends DetailedResponse<TransactionFromScanDto[]> {
  status: ResultStatus;
  errors: Error[] | string[];
  data: TransactionFromScanDto[];
}

export class TransactionsDetailedResponseDto
  extends DetailedResponseDto<TransactionFromScanDto[]>
  implements TransactionsDetailedResponse
{
  @ApiProperty({
    type: String,
    enum: ResultStatus,
    enumName: 'ResultStatus',
    example: ResultStatus.ok,
  })
  status: ResultStatus;

  @ApiProperty({
    type: [String],
    example: ['connect ECONNREFUSED ...'],
  })
  errors: Error[] | string[];

  @ApiProperty({
    isArray: true,
    type: TransactionFromScanDto,
  })
  data: TransactionFromScanDto[];
}

export class SubTransactionDto {
  @ApiProperty({ type: String, example: '0xab5c66752a9e8167967685f1450532fb96d5d24f' })
  address: Address;

  @ApiProperty({ type: String, example: '605271.935' })
  amount: string;

  @ApiProperty({ type: String, example: 'LYM' })
  symbol: string;

  @ApiProperty({ type: Number, example: 18 })
  decimals: number;

  @ApiProperty({ type: String, example: '0xab5c66752a9e8167967685f1450532fb96d5d24f' })
  from: string;

  @ApiProperty({ type: String, example: '0xab5c66752a9e8167967685f1450532fb96d5d43f' })
  to: string;

  @ApiProperty({
    enum: SubTransactionTypEnum,
    enumName: 'SubTransactionTypEnum',
    example: SubTransactionTypEnum.incoming,
  })
  type: string;

  @ApiProperty({ type: String, example: '0xc690f7c7fcffa6a82b79fab7508c466fefdfc8c5' })
  tokenAddress: string;

  @ApiProperty({ type: Number, example: 0.00950568 })
  price: number;

  constructor(transferEntity: Partial<SubTransactionDto>) {
    Object.assign(this, transferEntity);
  }
}

export class TransactionsNewDetailedResponseDto extends DetailedResponseDto<TransactionNewDto[]> {
  @ApiProperty({
    type: String,
    enum: ResultStatus,
    enumName: 'ResultStatus',
    example: ResultStatus.ok,
  })
  status: ResultStatus;

  @ApiProperty({
    type: [String],
    example: ['connect ECONNREFUSED ...'],
  })
  errors: Error[] | string[];

  @ApiProperty({
    isArray: true,
    type: TransactionNewDto,
  })
  data: TransactionNewDto[];
}
