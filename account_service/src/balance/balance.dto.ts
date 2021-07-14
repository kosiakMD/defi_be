// eslint-disable-next-line max-classes-per-file
import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { Address } from '../common/interfaces';
import { ChainsIds } from '../common/types';
import { AccountTokenBalance, Balance, BalanceToken } from './interfaces/balance.interfaces';

interface BalancesQuery {
  addresses: Address[];
  chains: ChainsIds;
  internal: number;
}

export class BalancesQueryDto implements BalancesQuery {
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
  @ApiProperty({
    type: [Number],
    example: [1, 2],
  })
  chains: ChainsIds;

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
  @ApiProperty({ type: Number, example: 1 })
  chainId: number;
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
  @ApiProperty({ type: String, example: 'ETH' })
  symbol: string;
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

export class BalanceDto implements Balance {
  @ApiProperty({ type: Number, example: 0 })
  totalUsd: number;

  @ApiProperty({ type: AccountTokenBalanceDto, isArray: true })
  tokens: AccountTokenBalance;
}

export class BalancesResponseDto {
  @ApiProperty({
    description: 'User address which comes as param',
    type: BalanceDto,
  })
  '0x782629c9578889a9b8464f051f23843734f72599': BalanceDto;
}
