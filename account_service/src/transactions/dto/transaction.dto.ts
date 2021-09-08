// eslint-disable-next-line max-classes-per-file
import { Exclude, Expose, plainToClass, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { ChainIdToAbbr } from 'src/common/constatnt/dictionaries';
import { DetailedResponseDto } from 'src/common/dto';
import { ChainIdEnum, ChainNameEnum, ResultStatus } from 'src/common/enum';
import { Address } from 'src/common/interfaces';

import { ChainDto } from '../../balance/dto/chain.dto';
import { CryptoCurrencyDto, CurrencyDto } from '../../balance/dto/currency.dto';
import { TransactionBaseDto } from './transaction.base.dto';
import { SubTransactionDto } from './transactions.dto';

export class TransactionDto extends TransactionBaseDto {
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

  constructor(transaction: Partial<TransactionDto>) {
    super();
    Object.assign(this, transaction);
  }
}

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
