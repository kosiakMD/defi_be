// eslint-disable-next-line max-classes-per-file
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import Web3 from 'web3';

import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, ChainSymbols } from 'src/common/enum';
import { Address } from 'src/common/interfaces';

import {
  AccountBalance,
  AccountTokenBalance,
  BalanceToken,
  ErrorMessage,
} from './interfaces/balance.interfaces';

const web3 = new Web3();

interface BalancesQuery {
  addresses: Address[];
  chains: ChainIdEnum[];
  internal: number;
}

export class BalancesQueryDto implements BalancesQuery {
  @IsNotEmpty()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    value.forEach((address: string) => {
      if (!web3.utils.isAddress(address)) {
        throw new BadRequestException(`Address '${address}' is not valid`);
      }
    });
    return value;
  })
  @IsString({ each: true })
  addresses: Address[];

  @IsOptional()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    return value.map((x) => parseInt(x, 10));
  })
  @IsArray()
  @IsInt({ each: true })
  @ApiProperty({
    type: [ChainIdEnum],
    example: [ChainIdEnum.eth, ChainIdEnum.bsc],
    default: [ChainIdEnum.eth],
  })
  chains: ChainIdEnum[] = [ChainIdEnum.eth];

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @ApiProperty({
    type: Number,
    default: 1,
  })
  internal: number;

  constructor(data: BalancesQueryDto) {
    Object.assign(this, data);
  }
}

export class BalanceTokenDto implements BalanceToken {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chainId: ChainIdEnum;
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
  @ApiProperty({ enum: ChainSymbols, enumName: 'ChainSymbols', example: ChainSymbols.ETH })
  symbol: ChainSymbols;
  @ApiProperty({ type: String, example: 'Ether' })
  name: string;
  @ApiProperty({ type: String, example: '0x0000000000000000000000000000000000000000' })
  address: string;
  @ApiProperty({ type: Boolean, example: false, required: false })
  isLp?: boolean;
}

export class AccountTokenBalanceDto implements AccountTokenBalance {
  @ApiProperty({ type: String, example: '95480719361477141' })
  amount: string;
  @ApiProperty({ type: String, example: '0x782629c9578889a9b8464f051f23843734f72599' })
  account: string;
  @ApiProperty({ type: Number, example: 0.09548071936147715 })
  decimalsAmount: number;
  @ApiProperty({ type: Number, example: 2177.94, required: false })
  tokenPriceUSD?: number;
  @ApiProperty({ type: Number, example: 18346602.807013184, required: false })
  totalPriceUSD?: number;
  @ApiProperty({ type: BalanceTokenDto })
  token: BalanceTokenDto;
}

export class ErrorDto implements ErrorMessage {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chainId: ChainIdEnum;

  @ApiProperty({ type: Number, example: 502 })
  statusCode: number;

  @ApiProperty({ type: String, example: 'Connection to web3 provider failed' })
  message: string;

  constructor(chainId: number, statusCode: number, message: string) {
    this.chainId = chainId;
    this.statusCode = statusCode;
    this.message = message;
  }
}

export class BalanceDto implements AccountBalance {
  @ApiProperty({ type: Number, example: 0 })
  totalUsd: number;

  @ApiProperty({ type: AccountTokenBalanceDto, isArray: true })
  tokens: AccountTokenBalance[];

  @ApiProperty({ type: [ErrorDto] })
  errors?: ErrorMessage[];
}

export class AllBalancesDto {
  address: Address;
  balances: {
    chain: ChainIdEnum;
    items: any[];
    status: string;
    error: string | null | Error;
  }[];
}

export class BalancesResponseDto {
  @ApiProperty({
    description: 'User address which comes as param',
    type: BalanceDto,
  })
  '0x782629c9578889a9b8464f051f23843734f72599': BalanceDto;
}
