// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { DetailedResponseDto } from '../common/DTO';
import { ResultStatus } from '../common/enum';
import { splitToArray } from '../utils/transform';

export class TransactionScanDto {
  @ApiProperty({ example: '10266704', type: String })
  blockNumber: string;
  @ApiProperty({ example: '1592175374', type: String })
  timeStamp: string;
  @ApiProperty({
    example: '0x6e4095c452687edc2d4a3446036131786eb1a57264c8eb332663a66f45649465',
    type: String,
  })
  hash: string;
  @ApiProperty({ example: '1', type: String })
  nonce: string;
  @ApiProperty({
    example: '0x09cf6f9840af268c4e47a6c6ae2d8465dcded1718af0e7041a75ace165978b3c',
    type: String,
  })
  blockHash: string;
  @ApiProperty({ example: '56', type: Number })
  transactionIndex: number;
  @ApiProperty({ example: '0xc4b5c60672ae9e714add00eed9325c4a583e4cbd', type: String })
  from: string;
  @ApiProperty({ example: '0xcff17036c5ae141f2244f480fc16ba244ffab33b', type: String })
  to: string;
  @ApiProperty({ example: '424342961679074563', type: String })
  value: string;
  @ApiProperty({ example: '25200', type: String })
  gas: string;
  @ApiProperty({ example: '13200000000', type: String })
  gasPrice: string;
  @ApiProperty({ example: '0', type: String })
  isError: string;
  @ApiProperty({ example: '1', type: String })
  txreceiptStatus: string;
  @ApiProperty({ example: '0x', type: String })
  input: string;
  @ApiProperty({ example: '', type: String })
  contractAddress: string;
  @ApiProperty({ example: '3696510', type: String })
  cumulativeGasUsed: string;
  @ApiProperty({ example: '21000', type: String })
  gasUsed: string;
  @ApiProperty({ example: '2390490', type: String })
  confirmations: string;
  @ApiProperty({ example: null, type: Number })
  chainId: number;
  @ApiProperty({ example: null, type: Boolean })
  isInternal?: boolean;
}

export class TransactionQueryDto {
  @IsOptional()
  @Transform(({ value }) => splitToArray(value).map((x) => parseInt(x, 10)))
  @IsInt({ each: true })
  @ApiProperty({
    type: Number,
    required: false,
    description: `Array of chains' IDs (comma separated)`,
  })
  chains;

  @IsNotEmpty()
  @IsString({ each: true })
  @Transform(({ value }) => splitToArray(value))
  @ApiProperty({
    type: String,
    required: true,
    description: 'Array of token / coin addresses (comma separated)',
    default:
      '0xbddab785b306bcd9fb056da189615cc8ece1d823,0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
  })
  addresses: string[];
}

class GasDto {
  @ApiProperty()
  price: number;
  @ApiProperty()
  eth: number;
  @ApiProperty()
  usd: number;
}

class AmountDto {
  @ApiProperty()
  eth: number;
  @ApiProperty()
  usd: number;
}

class TransactionDto {
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

export class TransactionsResponseDto {
  @ApiProperty({ type: TransactionDto, isArray: true })
  address: TransactionDto;
}

export class TransactionsDetailedResponseDto extends DetailedResponseDto<TransactionScanDto[]> {
  constructor(...args) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    super(...args);
  }

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
    type: TransactionScanDto,
  })
  data: TransactionScanDto[];
}
