// eslint-disable-next-line max-classes-per-file
import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { Address, Chains } from '../common/interfaces';
import { splitToArray } from '../utils/transform';
import { ERC20Token, ERC20Transfer, Transfer } from './transfers.interfaces';

export class AmountDto {
  @ApiProperty({ example: 0.0362313268178732 })
  eth: number;
  @ApiProperty({ example: 0 })
  usd: number;
}

export class ERC20TokenDto implements ERC20Token {
  @ApiProperty({ example: '0xbddab785b306bcd9fb056da189615cc8ece1d823' })
  address: string;
  @ApiProperty({ example: null })
  name: string;
  @ApiProperty({ type: String, example: 'SushiToken' })
  symbol: string;
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
  @ApiProperty({ type: Number, example: 92077.06746043958, required: false })
  totalSupply: number;
}

export class ERC20TransferDto {
  @ApiProperty({ example: '0xe5ccfca59acd6a3dea18a97a8d12a1fc5be09b13' })
  fromAddress: string;
  @ApiProperty({ example: '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85' })
  toAddress: string;
  @ApiProperty({ example: '20000000000000000000' })
  amount: number;
  @ApiProperty({ type: ERC20TokenDto })
  token: ERC20Token;
  @ApiProperty({ example: null })
  tokenPriceUSD?: number;
  @ApiProperty({ example: 0 })
  totalPriceUSD?: number;
}

export class TransferDto implements Transfer {
  // TODO: add Chains Enum
  @ApiProperty({ example: 1 })
  chainId: number;
  @ApiProperty({ example: '0x0e91ee6e298b4856a7d58e77c7926453cf46edc147a78e4d5cfe2e4c1c675499' })
  hash: string;
  // TODO: number return as strings WTF
  @ApiProperty({ example: '8662896' })
  blockNumber: string;
  @ApiProperty({ example: 1570019740 })
  blockTimeStamp: number;
  @ApiProperty({ example: 164980 })
  gas: number;
  @ApiProperty({ example: 371800000000 })
  gasPrice: number;
  @ApiProperty({ example: 0.061339564000000006 })
  gasUsed: number;
  @ApiProperty({ type: ERC20TransferDto, isArray: true })
  erc20Transfers: ERC20Transfer[];
}

const transferExample: Transfer = {
  chainId: 1,
  hash: '0x6277ad9a3302420a63d01f8c26a3e4c810ba5c6a44138253abf03c5b7cccd29b',
  blockNumber: '11020705',
  blockTimeStamp: 1602239613,
  gas: 164980,
  gasPrice: 371800000000,
  gasUsed: 0.061339564000000006,
  erc20Transfers: [
    {
      fromAddress: '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85',
      toAddress: '0xd55684f4369040c12262949ff78299f2bc9db735',
      amount: '11261932258308446783', // TODO: number?
      token: {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 18,
        // totalSupply: '3915158404242953',
      },
      tokenPriceUSD: null,
      totalPriceUSD: 0,
    },
  ],
};

export class TransfersResponseDto {
  @ApiProperty({
    description: 'User address which comes as param',
    example: [transferExample],
  })
  '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85': TransferDto[];
}

export interface TransferQuery {
  chains: Chains;
  addresses: Address[];
}

export class TransferQueryDto implements TransferQuery {
  @IsNotEmpty()
  @Transform(({ value }) => splitToArray(value))
  @IsString({ each: true })
  addresses: Address[];

  @IsOptional()
  @Transform(({ value, key }) => {
    if (key && !value) {
      throw new BadRequestException(`Empty param '${key}' is not allowed`)
    }
    return splitToArray(value).map((x) => parseInt(x, 10))
  })
  @IsArray()
  @IsInt({ each: true })
  chains: Chains;
}
