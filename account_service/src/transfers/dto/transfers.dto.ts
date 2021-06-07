// eslint-disable-next-line max-classes-per-file
import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { Address } from '../../common/interfaces';
import { Chains } from '../../common/types';
import {
  ERC20Token,
  ERC20Transfer,
  TransactionWithTokenAndPrices,
} from '../interfaces/transfers.interfaces';

interface TransfersQuery {
  addresses: Address[];
  chains: Chains;
  internal: number;
}

export class TransfersQueryDto implements TransfersQuery {
  @IsNotEmpty()
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
  chains;

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

  constructor(transfer: TransactionWithTokenAndPrices) {
    Object.assign(this, {
      address: transfer.tokenAddress,
      name: transfer.tokenName,
      symbol: transfer.tokenSymbol,
      decimals: transfer.tokenDecimals,
      totalSupply: transfer.tokenTotalSupply,
    });
  }
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

export class TransferDto {
  @ApiProperty({ example: 1 })
  chainId: number;
  @ApiProperty({ example: '0x0e91ee6e298b4856a7d58e77c7926453cf46edc147a78e4d5cfe2e4c1c675499' })
  hash: string;
  @ApiProperty({ example: '8662896' })
  blockNumber: number;
  @ApiProperty({ example: '1570019740' })
  blockTimeStamp: number;
  @ApiProperty({ example: '50000' })
  gas: number;
  @ApiProperty({ example: '500' })
  gasPrice: number;
  @ApiProperty({ example: '10000' })
  gasUsedEther: number;
  @ApiProperty({ type: ERC20TransferDto })
  erc20Transfers: ERC20Transfer[];
}

export class TransfersResponseDto {
  @ApiProperty({
    description: 'User address which comes as param',
    example: [
      {
        chainId: 1,
        hash: '0x6277ad9a3302420a63d01f8c26a3e4c810ba5c6a44138253abf03c5b7cccd29b',
        blockNumber: '11020705',
        blockTimeStamp: '1602239613',
        gas: {
          price: 65000.001459,
          eth: null,
          usd: null,
        },
        erc20Transfers: [
          {
            fromAddress: '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85',
            toAddress: '0xd55684f4369040c12262949ff78299f2bc9db735',
            amount: '1000000',
            token: {
              address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              name: 'USD Coin',
              symbol: 'USDC',
              decimals: '6',
              totalSupply: '3915158404242953',
              amount: {
                decimals: 1,
                usd: 0,
              },
            },
            tokenPriceUSD: null,
            totalPriceUSD: 0,
          },
        ],
      },
    ],
  })
  '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85': TransferDto[];
}
