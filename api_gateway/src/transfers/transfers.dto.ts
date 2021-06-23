// eslint-disable-next-line max-classes-per-file
import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { DetailedResponseDto } from '../common/DTO';
import { ResultStatus } from '../common/enum';
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
  @ApiProperty({ example: 1570019740 })
  blockTimeStamp: number;
  // TODO: uncomment when gas will be added to DB
  // @ApiProperty({ example: 164980 })
  // gas: number;
  // @ApiProperty({ example: 371800000000 })
  // gasPrice: number;
  // @ApiProperty({ example: 0.061339564000000006 })
  // gasUsed: number;
  @ApiProperty({ type: ERC20TransferDto, isArray: true })
  erc20Transfers: ERC20Transfer[];
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
      throw new BadRequestException(`Empty param '${key}' is not allowed`);
    }
    return splitToArray(value).map((x) => parseInt(x, 10));
  })
  @IsArray()
  @IsInt({ each: true })
  chains: Chains;
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
            tokenPriceUSD: 15.4971,
            totalPriceUSD: 2.8770831063e-12,
          },
        ],
      },
      {
        chainId: 2,
        hash: '0x52415f1a094ed09799879b294762b9b8484e827e14754aea177ad322b59f680a',
        blockTimeStamp: '1621776463',
        gasUsed: null,
        erc20Transfers: [
          {
            fromAddress: '0x0d0707963952f2fba59dd06f2b425ace40b492fe',
            toAddress: '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
            amount: '113900000000000000',
            token: {
              address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
              name: 'Ethereum Token',
              symbol: 'ETH',
              decimals: 18,
            },
            tokenPriceUSD: null,
            totalPriceUSD: null,
          },
        ],
      },
    ],
  })
  '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85': TransferDto[];
}

export class TransfersDetailedResponseDto extends DetailedResponseDto<TransfersResponseDto> {
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
    type: TransfersResponseDto,
  })
  data: TransfersResponseDto;
}
