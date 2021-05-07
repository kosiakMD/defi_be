// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { splitToArray } from '../utils/transform';
import { ERC20Token, ERC20Transfer } from './transfers.interfaces';

class GasDto {
  @ApiProperty({ example: 1.01e-9 })
  price: number;
  @ApiProperty({ example: null })
  eth: number;
  @ApiProperty({ example: null })
  usd: number;
}

export class AmountDto {
  @ApiProperty({ example: 0.0362313268178732 })
  eth: number;
  @ApiProperty({ example: 0 })
  usd: number;
}

export class ERC20TokenDto {
  @ApiProperty({ example: '0xbddab785b306bcd9fb056da189615cc8ece1d823' })
  address: string;
  @ApiProperty({ example: null })
  name: string;
  @ApiProperty({ type: String, example: 'SushiToken' })
  symbol: string;
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
  @ApiProperty({ type: Number, example: 92077.06746043958 })
  totalSupply: number;
  @ApiProperty({ type: AmountDto })
  amount: AmountDto;
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
  @ApiProperty({ type: GasDto })
  gas: GasDto;
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

export class TransferQueryDto {
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
