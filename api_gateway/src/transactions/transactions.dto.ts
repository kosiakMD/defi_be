// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { TransactionScanDto } from '../scans-api/scans-api.dto';
import { ChainDto } from './chain.dto';
import { CryptoCurrencyDto, CurrencyDto } from './currency.dto';
import { TokenOperations } from './enums';
import { Transaction } from './transactions.interfaces';
import { DetailedResponseDto } from 'src/common/DTO';
import { ResultStatus } from 'src/common/enum';
import { Address } from 'src/common/interfaces';

class GasDto {
  @ApiProperty({ type: Number, example: 1.1900000000000001e-7 })
  price: number;
  @ApiProperty({ type: Number, example: 0.0024990000000000004 })
  eth: number;
  @ApiProperty({ type: Number, example: 0 })
  usd: number;
}

class AmountDto {
  @ApiProperty({ type: Number, example: 0.0362313268178732 })
  eth: number;
  @ApiProperty({ type: Number, example: 0 })
  usd: number;
}

class TransactionDto implements Transaction {
  @ApiProperty({ type: Number, example: 1 })
  chainId: number;
  @ApiProperty({
    type: String,
    example: '0xc343e8f4f3109390d62c4004b814df4d68747c8b6b6d60d1b4c33436aa8d93e0',
  })
  hash: string;
  @ApiProperty({ type: String, example: '11932496' })
  blockNumber: string;
  @ApiProperty({ type: String, example: '0xf90dce9671765d8cf9634122cd2306cd094c777c' })
  from: string;
  @ApiProperty({ type: String, example: '0x782629c9578889a9b8464f051f23843734f72599' })
  to: string;
  @ApiProperty({ type: String, example: '1614338271' })
  blockTimestamp: string;
  @ApiProperty({ type: AmountDto })
  amount: AmountDto;
  @ApiProperty({ type: GasDto })
  gas: GasDto;
}

export class TransactionsResponseDto {
  @ApiProperty({
    description: 'Address which comes as param',
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

export class TransactionsDetailedResponseDto extends DetailedResponseDto<TransactionScanDto[]> {
  @ApiProperty({
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
    type: TransactionScanDto,
  })
  data: TransactionScanDto[];
}

class PriceDto {
  @ApiProperty({ type: Number, example: 111 })
  value: number;

  @ApiProperty({ type: CurrencyDto })
  currency: CurrencyDto = new CurrencyDto();

  constructor(data?: Partial<PriceDto>) {
    Object.assign(this, data);
  }
}

class GasPriceDto {
  @ApiProperty({ type: Number, example: 77000000000 })
  value: number;

  @ApiProperty({ type: CryptoCurrencyDto })
  currency: CryptoCurrencyDto = new CryptoCurrencyDto();

  constructor(data?: Partial<GasPriceDto>) {
    Object.assign(this, data);
  }
}

class NewGasDto {
  @ApiProperty({ type: Number, example: 21000 })
  used: number; // amount

  @ApiProperty({ type: GasPriceDto })
  price: GasPriceDto;

  @ApiProperty({ type: PriceDto, example: { value: 2.8108311, currency: { id: 1, name: 'usd' } } })
  fee: PriceDto;

  constructor(data: Partial<GasDto>) {
    Object.assign(this, data);
  }
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
  from?: string;

  @ApiProperty({ type: String, example: '0xab5c66752a9e8167967685f1450532fb96d5d24f' })
  to?: string;

  @ApiProperty({ type: String })
  type: string;

  @ApiProperty({ type: String, example: '0xc690f7c7fcffa6a82b79fab7508c466fefdfc8c5' })
  tokenAddress: string;

  @ApiProperty({ type: Number, example: 0.00950568 })
  price: number;

  constructor(transferEntity: Partial<SubTransactionDto>) {
    Object.assign(this, transferEntity);
  }
}

export class TransactionNewDto {
  @ApiProperty({
    type: String,
    example: '0x1583b096aa28d7c047cc321e9bef1c2a23857637fdc797626cbce5e216f75e8e',
  })
  hash: string = null;

  @ApiProperty({ type: Number, example: 12768337 })
  blockNumber: number = null;

  @ApiProperty({ type: String, example: '0xab5c66752a9e8167967685f1450532fb96d5d24f' })
  address: Address = null;

  @ApiProperty({ type: String, example: '1625499513' })
  timestamp: string = null;

  @ApiProperty({ type: String, example: '1625499513' })
  sender?: string = null;

  @ApiProperty({ type: String, example: '1625499513' })
  destination?: string = null;

  @ApiProperty({
    enum: TokenOperations,
    enumName: 'TokenOperations',
    example: TokenOperations.RECEIVE,
  })
  tokenOperation?: TokenOperations = null;

  @ApiProperty({ type: Boolean, example: true })
  isVisible: boolean = null;

  @ApiProperty({ type: ChainDto })
  chain?: ChainDto = null;

  @ApiProperty({ type: GasDto })
  gas?: NewGasDto;

  @ApiProperty({
    type: SubTransactionDto,
    isArray: true,
  })
  subTransactions?: SubTransactionDto[] = null;
}

export class TransactionsNewDetailedResponseDto extends DetailedResponseDto<TransactionNewDto[]> {
  @ApiProperty({
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
