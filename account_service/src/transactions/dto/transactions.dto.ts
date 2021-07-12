// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { plainToClass } from 'class-transformer';

import { DetailedResponseDto } from '../../common/dto';
import { ResultStatus } from '../../common/enum';
import { Address, DetailedResponse } from '../../common/interfaces';
import { TransactionsEntity } from '../entity/transactions.entity';
import { Transaction } from '../interfaces/transactions.interfaces';
import { TransactionDto as TransactionFromScanDto } from './api.transactions.dto';

class GasDto {
  @ApiProperty({ example: 1.1900000000000001e-7 })
  price: number;
  @ApiProperty({ example: 0.0024990000000000004 })
  eth: number;
  @ApiProperty({ example: 0 })
  usd: number;
}

class AmountDto {
  @ApiProperty({ example: 0.0362313268178732 })
  eth: number;
  @ApiProperty({ example: 0 })
  usd: number;
}

class TransactionDto implements Transaction {
  @ApiProperty({ example: 1 })
  chainId: number;
  @ApiProperty({ example: '0xc343e8f4f3109390d62c4004b814df4d68747c8b6b6d60d1b4c33436aa8d93e0' })
  hash: string;
  @ApiProperty({ example: '11932496' })
  blockNumber: string;
  @ApiProperty({ example: '0xf90dce9671765d8cf9634122cd2306cd094c777c' })
  from: string;
  @ApiProperty({ example: '0x782629c9578889a9b8464f051f23843734f72599' })
  to: string;
  @ApiProperty({ example: '1614338271' })
  blockTimestamp: string;
  @ApiProperty({ type: AmountDto })
  amount: AmountDto;
  @ApiProperty({ type: GasDto })
  gas: GasDto;
}

export class TransactionsResponseDto {
  @ApiProperty({
    description: 'User address which comes as param',
    example: [
      {
        chainId: 1,
        hash: '0xc343e8f4f3109390d62c4004b814df4d68747c8b6b6d60d1b4c33436aa8d93e0',
        blockNumber: '11932496',
        from: '0xf90dce9671765d8cf9634122cd2306cd094c777c',
        to: '0x782629c9578889a9b8464f051f23843734f72599',
        blockTimestamp: '1614338271',
        amount: {
          eth: 0.0362313268178732,
          usd: 0,
        },
        gas: {
          price: 1.1900000000000001e-7,
          eth: 0.0024990000000000004,
          usd: 0,
        },
      },
    ],
  })
  // eslint-disable-next-line prettier/prettier
  // [address: string]: TransactionDto[];
  '0x782629c9578889a9b8464f051f23843734f72599': TransactionDto[];
}

class TransactionScanDto {
  @ApiProperty()
  eth: number;
  @ApiProperty()
  usd: number;

  @ApiProperty()
  chainId: number;
  @ApiProperty()
  hash: string;
  @ApiProperty()
  blockNumber: string;
  @ApiProperty()
  from: string;
  @ApiProperty()
  to: string;
  @ApiProperty({ type: AmountDto })
  amount: AmountDto;
  @ApiProperty({ type: GasDto })
  gas: GasDto;
  @ApiProperty()
  gasPrice: string;
  @ApiProperty()
  timeStamp: string;
}

export class TransactionsScanResponseDto {
  @ApiProperty({ type: TransactionDto, isArray: true })
  address: TransactionScanDto;
}

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
    enum: ResultStatus,
    enumName: 'ResultStatus',
    example: ResultStatus.ok,
  })
  status: ResultStatus;

  @ApiProperty({
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

  @ApiProperty({ type: Number, example: 19789 })
  gasUsed: number;

  @ApiProperty({ type: Number, example: 0.70202506528 })
  gasUsedUsd: number;

  @ApiProperty({ type: Number, example: 0.00950568 })
  price: number;

  @ApiProperty({ type: String, example: 'LYM' })
  symbol: string;

  @ApiProperty({ type: String, example: '0xc690f7c7fcffa6a82b79fab7508c466fefdfc8c5' })
  tokenAddress: string;

  @ApiProperty({ type: String, example: 'incoming' })
  type: string;

  constructor(transferEntity: Partial<SubTransactionDto>) {
    Object.assign(this, transferEntity);
  }
}

export class TransactionNewDto {
  @ApiProperty({ type: String, example: '83' })
  id: string;
  @ApiProperty({
    type: String,
    example: '0x1583b096aa28d7c047cc321e9bef1c2a23857637fdc797626cbce5e216f75e8e',
  })
  hash: string;
  @ApiProperty({ type: String, example: '12768337' })
  blockNumber: string;
  @ApiProperty({ type: String, example: '1625499513' })
  timestamp: string;
  @ApiProperty({ type: String, example: '0xab5c66752a9e8167967685f1450532fb96d5d24f' })
  address: Address;
  @ApiProperty({ type: Number, example: 95000 })
  gas: number;
  @ApiProperty({ type: String, example: '16000000000' })
  gasPrice: string;
  @ApiProperty({ type: String, example: 'receive' })
  name: string;
  @ApiProperty({
    type: SubTransactionDto,
    isArray: true,
  })
  subTransactions: SubTransactionDto[];

  constructor(tsx: TransactionsEntity) {
    // console.log('tsx', tsx);

    Object.assign(this, tsx, {
      id: tsx.id,
      address: tsx.address,
      hash: tsx.hash,
      blockNumber: tsx.blockNumber,
      timestamp: tsx.timestamp,
      name: tsx.data.name,
      gas: tsx.data.gas,
      gasPrice: tsx.data.gasPrice,
      subTransactions: plainToClass(SubTransactionDto, tsx.data.subTransactions),
    });
  }
}

export class TransactionsNewDetailedResponseDto extends DetailedResponseDto<TransactionNewDto[]> {
  @ApiProperty({
    enum: ResultStatus,
    enumName: 'ResultStatus',
    example: ResultStatus.ok,
  })
  status: ResultStatus;

  @ApiProperty({
    example: ['connect ECONNREFUSED ...'],
  })
  errors: Error[] | string[];

  @ApiProperty({
    isArray: true,
    type: TransactionNewDto,
  })
  data: TransactionNewDto[];
}
