// eslint-disable-next-line max-classes-per-file
import { Exclude, Expose, plainToClass, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { Address, ChainNameEnum } from '@app/common';
import { ChainIdToAbbr } from '@app/common/constant/dictionaries';
import { DetailedResponseDto } from '@app/common/dto';
import { ChainIdEnum, ResultStatus } from '@app/common/enum';
import { DetailedResponse } from '@app/common/interfaces';

import { ChainDto } from '../../../common/dto/chain.dto';
import { CryptoCurrencyDto, CurrencyDto } from '../../../common/dto/currency.dto';

import { SubTransactionTypEnum } from '../transactions.enum';
import { Transaction } from '../transactions.interfaces';
import { TransactionsBaseDto } from './transactions.base.dto';

class PriceDto {
  @ApiProperty({ type: Number, example: 111 })
  value: number;

  @ApiProperty({ type: CurrencyDto })
  @Type(() => CurrencyDto)
  currency: CurrencyDto = new CurrencyDto();

  constructor(data?: Partial<PriceDto>) {
    Object.assign(this, data);
  }
}

class GasPriceDto {
  @ApiProperty({ type: Number, example: 77000000000 })
  value: number;

  @ApiProperty({ type: CryptoCurrencyDto })
  @Type(() => CryptoCurrencyDto)
  currency: CryptoCurrencyDto = new CryptoCurrencyDto();

  constructor(data?: Partial<GasPriceDto>) {
    Object.assign(this, data);
  }
}

class GasDtoSimple {
  @ApiProperty({ type: Number, example: 1.1900000000000001e-7 })
  price: number;
  @ApiProperty({ type: Number, example: 0.0024990000000000004 })
  eth: number;
  @ApiProperty({ type: Number, example: 0 })
  usd: number;
}

class GasDto {
  @ApiProperty({ type: Number, example: 21000 })
  used: number; // amount

  @ApiProperty({ type: GasPriceDto })
  @Type(() => GasPriceDto)
  price: GasPriceDto;

  @ApiProperty({ type: PriceDto, example: { value: 2.8108311, currency: { id: 1, name: 'usd' } } })
  @Type(() => PriceDto)
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

class AmountDto {
  @ApiProperty({ type: Number, example: 0.0362313268178732 })
  eth: number;
  @ApiProperty({ type: Number, example: 0 })
  usd: number;
}

class TransactionDto implements Transaction {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chainId: ChainIdEnum;
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
  gas: GasDtoSimple;
}

export class TransactionsResponseDto {
  @ApiProperty({
    type: [TransactionDto],
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
  @ApiProperty({ type: Number, example: 0.0362313268178732 })
  eth: number;
  @ApiProperty({ type: Number, example: 0.236 })
  usd: number;

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chainId: ChainIdEnum;
  @ApiProperty({
    type: String,
    example: 'c2e10c20bf46daf0ba03f725218b012544a3d0d3b37334eeb1d4d81e5406e478',
  })
  hash: string;
  @ApiProperty({ type: String, example: '11813368' })
  blockNumber: string;
  @ApiProperty({ type: String, example: '0xf5d669627376ebd411e34b98f19c868c8aba5ada' })
  from: string;
  @ApiProperty({ type: String, example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' })
  to: string;
  @ApiProperty({ type: AmountDto })
  amount: AmountDto;
  @ApiProperty({ type: GasDto })
  gas: GasDto;
  @ApiProperty({ type: String, example: '23' })
  gasPrice: string;
  @ApiProperty({ type: String, example: '1612754682' })
  timeStamp: string;
}

export class TransactionsScanResponseDto {
  @ApiProperty({ type: TransactionDto, isArray: true })
  address: TransactionScanDto;
}

export class TransactionsDto extends TransactionsBaseDto {
  @ApiProperty({ example: '1', type: String })
  txreceipt_status?: string; // eslint-disable-line camelcase

  @ApiProperty({ example: 0.06434159067634895, type: Number })
  feeUSD: number;

  @ApiProperty({ example: 232.11252047744935, type: Number })
  coinPriceUSD?: number;

  @ApiProperty({ example: 98.4953143821957, type: Number })
  valueUSD?: number;

  @ApiProperty({ example: false, type: Boolean, required: false })
  isInternal?: boolean;

  constructor(transaction: Partial<TransactionsDto>) {
    super();
    Object.assign(this, transaction);
  }
}

export enum TokenOperations {
  RECEIVE = 'receive',
  SEND = 'send',
  EXCHANGE = 'exchange',
}

@Exclude()
export class TransactionNewDto {
  @Expose()
  @ApiProperty({
    type: String,
    example: '0x1583b096aa28d7c047cc321e9bef1c2a23857637fdc797626cbce5e216f75e8e',
  })
  hash: string = null;

  @Expose()
  @ApiProperty({ type: Number, example: 12768337 })
  @Type(() => Number)
  blockNumber: number = null;

  @Expose()
  @ApiProperty({ type: String, example: '0xab5c66752a9e8167967685f1450532fb96d5d24f' })
  address: Address = null;

  @Type(() => String)
  @Expose()
  @ApiProperty({ type: String, example: '0xab5c66752a9e8167967685f1450532fb96d5d24f' })
  sender: string = null;

  @Type(() => String)
  @Expose()
  @ApiProperty({ type: String, example: '0xab5c66752a9e8167967685f1450532fb96d5d24f' })
  destination: string = null;

  @Type(() => String)
  @Expose()
  @ApiProperty({ type: String, example: '1625499513' })
  timestamp: string = null;

  @Expose()
  @ApiProperty({
    enum: TokenOperations,
    enumName: 'TokenOperations',
    example: TokenOperations.RECEIVE,
  })
  tokenOperation: TokenOperations = null;

  @Expose()
  @ApiProperty({ type: Boolean, example: true })
  isVisible: boolean = null;

  // for Chain
  @Expose({ toClassOnly: true })
  @ApiProperty({ type: Number, example: 1 })
  chainId: ChainIdEnum = null;

  @Expose()
  @Type(() => ChainDto)
  get chain(): ChainDto {
    return plainToClass(ChainDto, {
      id: this.chainId,
      symbol: ChainIdToAbbr[this.chainId],
      name: ChainNameEnum[ChainIdToAbbr[this.chainId]],
    } as ChainDto);
  }

  // for gas only
  @Expose({ toClassOnly: true })
  gasPrice: number = null;

  @Expose({ toClassOnly: true })
  feeUsd: number = null;

  @Expose({ toClassOnly: true })
  gasUsed: number = null;

  @Expose()
  @ApiProperty({ type: GasDto })
  @Type(() => GasDto)
  get gas(): GasDto {
    try {
      return plainToClass(GasDto, {
        used: this.gasUsed,
        price: { value: this.gasPrice /*, currency: 'eth'*/ } as GasPriceDto,
        fee: { value: this.feeUsd /*, currency: { id: 1, name: 'usd' }*/ } as PriceDto,
      });
    } catch {
      return null;
    }
  }

  @Expose()
  @ApiProperty({
    type: SubTransactionDto,
    isArray: true,
  })
  @Type(() => SubTransactionDto)
  subTransactions: SubTransactionDto[] = null;
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

export interface TransactionsDetailedResponse extends DetailedResponse<TransactionsDto[]> {
  status: ResultStatus;
  errors: Error[] | string[];
  data: TransactionsDto[];
}

export class TransactionsDetailedResponseDto
  extends DetailedResponseDto<TransactionsDto[]>
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
    type: TransactionsDto,
  })
  data: TransactionsDto[];
}
