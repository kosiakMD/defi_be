// eslint-disable-next-line max-classes-per-file
import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import Web3 from 'web3';

import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { Address, ChainAbbrEnum, ChainIdEnum } from '@app/common';

import {
  AccountBalance,
  ERC20Token,
  ErrorMessage,
  TokenBalance,
} from './interfaces/balance.interfaces';

const web3 = new Web3();

interface BalancesQuery {
  addresses: Address[];
  chains: ChainIdEnum[];
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
    default: [
      ChainIdEnum.eth,
      ChainIdEnum.bsc,
      ChainIdEnum.plg,
      ChainIdEnum.ftm,
      ChainIdEnum.arbi,
      ChainIdEnum.avax,
    ],
  })
  chains: ChainIdEnum[] = [
    ChainIdEnum.eth,
    ChainIdEnum.bsc,
    ChainIdEnum.plg,
    ChainIdEnum.ftm,
    ChainIdEnum.arbi,
    ChainIdEnum.avax,
  ];

  @IsOptional()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    value.forEach((address: string) => {
      if (!web3.utils.isAddress(address)) {
        throw new BadRequestException(`Asset '${address}' is not valid`);
      }
    });
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
  chains: ChainIdEnum[];

  @IsOptional()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    value.forEach((address: string) => {
      if (!web3.utils.isAddress(address)) {
        throw new BadRequestException(`Asset '${address}' is not valid`);
      }
    });
    return value;
  })
  @IsString({ each: true })
  assets: Address[];
}

export class BalanceTokenDto implements ERC20Token {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chainId: ChainIdEnum;
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
  @ApiProperty({ enum: ChainAbbrEnum })
  symbol: ChainAbbrEnum;
  @ApiProperty({ type: String, example: 'Ether' })
  name: string;
  @ApiProperty({ type: String, example: '0x0000000000000000000000000000000000000000' })
  address: string;
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
