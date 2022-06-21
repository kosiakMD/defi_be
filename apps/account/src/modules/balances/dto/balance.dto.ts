// eslint-disable-next-line max-classes-per-file
import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { Address, ChainAbbrEnum } from '@app/common';

import { AccountBalance, ERC20Token, ErrorMessage, TokenBalance } from '../balances.interfaces';

interface BalancesQuery {
  addresses: Address[];
  chains: number[];
}

const ChainList = [1, 2, 3, 4, 5];

export class DelegationsQueryDto {
  @IsNotEmpty()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    return value;
  })
  @IsString({ each: true })
  addresses: Address[];
}

export class BalancesQueryDto implements BalancesQuery {
  @IsNotEmpty()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
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
    type: Array,
    example: ChainList,
    default: ChainList,
  })
  chains: number[] = ChainList;

  @IsOptional()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    return value;
  })
  @IsString({ each: true })
  assets: Address[];

  constructor(data: BalancesQueryDto) {
    Object.assign(this, data);
  }
}

export class BalancesPostQueryDto implements BalancesQuery {
  @IsNotEmpty()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
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
  chains: number[];

  @IsOptional()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    return value;
  })
  @IsString({ each: true })
  assets: Address[];
}

export class BalanceTokenDto implements ERC20Token {
  @ApiProperty({ example: 1 })
  chainId: number;
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
  @ApiProperty({ enum: ChainAbbrEnum })
  symbol: ChainAbbrEnum;
  @ApiProperty({ type: String, example: 'Ether' })
  name: string;
  @ApiProperty({ type: String, example: '0x0000000000000000000000000000000000000000' })
  address: string;
  @ApiProperty({ type: String })
  icon?: string;
}

export class AccountTokenBalanceDto implements TokenBalance {
  @ApiProperty({ type: String, example: '95480719361477141' })
  amount: string;
  @ApiProperty({ type: String, example: '0x782629c9578889a9b8464f051f23843734f72599' })
  account: string;
  @ApiProperty({ type: Number, example: 0.09548071936147715 })
  decimalsAmount?: number;
  @ApiProperty({ type: Number, example: 2177.94, required: false })
  tokenPriceUSD?: number;
  @ApiProperty({ type: Number, example: 18346602.807013184, required: false })
  totalPriceUSD?: number;
  @ApiProperty({ type: BalanceTokenDto })
  @Type(() => BalanceTokenDto)
  token: BalanceTokenDto;
}

export class ErrorDto implements ErrorMessage {
  @ApiProperty({ example: 1 })
  chainId: number;

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
  @ApiProperty({ type: String, example: '0x1709f800fc9d0b210b6c1f69a7cdc492899808b6' })
  account: Address;

  @ApiProperty({ type: Number, example: 0 })
  totalUsd: number;

  @ApiProperty({ type: AccountTokenBalanceDto, isArray: true })
  tokens: AccountTokenBalanceDto[];

  @ApiProperty({ type: [ErrorDto] })
  errors?: ErrorMessage[];
}

export class AllBalancesDto {
  address: Address;
  balances: {
    chain: number;
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

export class TokenChange {
  token: ERC20Token;
  balance: number; // value of change in user balance
  price: number; // value of change in token price
  totalUSD: number; // total change (in USD) of balance & price over timespan
}

export class ChainChange {
  chainId: number;
  totalUSD: number; // total Change in USD for this change
}

export class AccountReturns {
  account: Address;
  errors: string[];
  tokens: TokenChange[];
  chains: ChainChange[];
  totalUSD: number;
}

export class ReturnsResponse {
  [key: Address]: AccountReturns;
}
