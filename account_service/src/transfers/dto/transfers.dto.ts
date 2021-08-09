// eslint-disable-next-line max-classes-per-file
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import {
  ERC20Token,
  ERC20Transfer,
  ScanTransfer,
  Transfer,
  TransfersResponse,
  TransferWithTokenAndPrices,
} from '../interfaces/transfers.interfaces';
import { exampleResponse } from './transfers.dto.examples';
import { DetailedResponseDto } from 'src/common/dto';
import { ResultStatus } from 'src/common/enum';
import { Address } from 'src/common/interfaces';
import { ChainId, ChainsIds } from 'src/common/types';

interface TransfersQuery {
  addresses: Address[];
  chains: ChainsIds;
  internal: number;
}

export class TransfersQueryDto implements TransfersQuery {
  @IsNotEmpty()
  @IsString({ each: true })
  addresses: Address[];

  @IsOptional()
  @Transform(({ value, key }) => {
    if (key && !value) {
      throw new BadRequestException(`Empty param '${key}' is not allowed`);
    }
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of '${key}' - is not an Array`);
    }
    return value.map((x) => parseInt(x, 10));
  })
  @IsArray()
  @IsInt({ each: true })
  chains: number[];

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  internal: number;

  constructor(data: TransfersQueryDto) {
    Object.assign(this, data);
  }
}

export class ERC20TokenDto {
  // TODO: add isEthAddress ?
  @ApiProperty({ example: '0xbddab785b306bcd9fb056da189615cc8ece1d823' })
  @IsString()
  @Transform(({ value }) => value.toLowerCase())
  address: string;

  @ApiProperty({ example: null })
  @IsString()
  name: string;

  @ApiProperty({ type: String, example: 'SushiToken' })
  @IsString()
  symbol: string;

  @IsInt()
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;

  // TODO change to decimal
  @IsNumber()
  @ApiProperty({ type: Number, example: 92077.06746043958 })
  totalSupply: number;

  @IsBoolean()
  @ApiProperty({ type: Boolean, example: true })
  isIncludedToGraph: number;

  // constructor(data: Partial<ERC20TokenDto>) {
  constructor(transfer: TransferWithTokenAndPrices) {
    Object.assign(this, {
      address: transfer.tokenAddress,
      name: transfer.tokenName,
      symbol: transfer.tokenSymbol,
      decimals: transfer.tokenDecimals,
      totalSupply: transfer.tokenTotalSupply,
      isIncludedToGraph: transfer.isIncludedToGraph,
    });
  }
}

export class ERC20TransferDto implements ERC20Transfer {
  @ApiProperty({ type: String, example: '0xe5ccfca59acd6a3dea18a97a8d12a1fc5be09b13' })
  fromAddress: string;

  @ApiProperty({ type: String, example: '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85' })
  toAddress: string;

  @ApiProperty({ type: String, example: '20000000000000000000' })
  amount: string;

  @ApiProperty({ type: Number, example: null })
  tokenPriceUSD: number | null;

  @ApiProperty({ type: Number, example: 0 })
  totalPriceUSD: number | null;

  @ApiProperty({ type: ERC20TokenDto })
  token: ERC20Token;

  // constructor(data: Partial<ERC20TransferDto>) {
  constructor(transfer: TransferWithTokenAndPrices) {
    const tokenErc20 = new ERC20TokenDto(transfer);

    Object.assign(this, {
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      amount: transfer.amount,
      tokenPriceUSD: transfer.tokenPriceUSD,
      totalPriceUSD: transfer.totalPriceUSD,
      token: tokenErc20,
    });
  }
}

export class ScanTransferDto implements ScanTransfer {
  @ApiProperty({ type: Number, example: 1 })
  chainId: ChainId;
  @ApiProperty({
    type: String,
    example: '0x0e91ee6e298b4856a7d58e77c7926453cf46edc147a78e4d5cfe2e4c1c675499',
  })
  hash: string;
  @ApiProperty({ type: String, example: '8662896' })
  blockNumber: number;
  @ApiProperty({ type: String, example: '1570019740' })
  blockTimeStamp: number;
  @ApiProperty({ type: String, example: '50000' })
  gas: number;
  @ApiProperty({ type: String, example: '500' })
  gasPrice: number;
  @ApiProperty({ type: Number, example: '21000' })
  gasUsed: number;
  @ApiProperty({ type: ERC20TransferDto })
  erc20Transfers: ERC20Transfer[];
}

export class TransferDto implements Transfer {
  @ApiProperty({ type: Number, example: 1 })
  chainId: ChainId;

  @ApiProperty({
    type: String,
    example: '0x0e91ee6e298b4856a7d58e77c7926453cf46edc147a78e4d5cfe2e4c1c675499',
  })
  hash: string;

  @ApiProperty({ type: String, example: '1570019740' })
  blockTimeStamp: string;

  // TODO: until no gas in DB
  // @ApiProperty({ type: String, example: '21000' })
  // gasUsed: string;

  @ApiProperty({ type: ERC20TransferDto })
  erc20Transfers: ERC20Transfer[];

  constructor(transferEntity: Partial<TransferDto>) {
    Object.assign(this, transferEntity);
  }
}

export class TransfersResponseDto implements TransfersResponse<Transfer> {
  [key: string]: Transfer[];
}

export class TransfersDetailedResponseDto extends DetailedResponseDto<TransfersResponseDto> {
  constructor(status: ResultStatus, errors: Error[] | string[], data: TransfersResponseDto) {
    super(status, errors, data);
  }

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
  errors: Array<Error | string>;

  @ApiProperty({
    type: Object,
    isArray: true,
    description: 'Object key is address passed as param; Object value is TransferDto;',
    additionalProperties: {
      type: 'TransferDto',
      $ref: 'TransferDto',
    },
    example: exampleResponse,
  })
  data: TransfersResponseDto;

  error(error?: Error | string): void {
    this.status = ResultStatus.error;
    error && this.errors.push(error);
  }
}
