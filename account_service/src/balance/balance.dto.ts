// eslint-disable-next-line max-classes-per-file
import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { Address } from '../common/interfaces';
import { Chains } from '../common/types';
import { AccountTokenBalance, Balance, BalanceToken } from './interfaces/balance.interfaces';

interface BalancesQuery {
  addresses: Address[];
  chains: Chains;
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
  chains;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @ApiProperty({
    default: 1,
  })
  internal: number;

  constructor(data: BalancesQueryDto) {
    Object.assign(this, data);
  }
}

export class BalanceTokenDto implements BalanceToken {
  @ApiProperty({ example: 1 })
  chainId;
  @ApiProperty({ example: 18 })
  decimals;
  @ApiProperty({ example: 'ETH' })
  symbol;
  @ApiProperty({ example: 'Ether' })
  name;
  @ApiProperty({ example: '0x0000000000000000000000000000000000000000' })
  address;
}

export class AccountTokenBalanceDto implements AccountTokenBalance {
  @ApiProperty({ example: '95480719361477141' })
  amount;
  @ApiProperty({ example: '0x782629c9578889a9b8464f051f23843734f72599' })
  account;
  @ApiProperty({ example: 0.09548071936147715 })
  decimalsAmount;
  @ApiProperty({ example: 0 })
  tokenPriceUSD?;
  @ApiProperty({ example: 0 })
  totalPriceUSD?;
  @ApiProperty({ type: BalanceTokenDto })
  token;
}

export class BalanceDto implements Balance {
  @ApiProperty({ example: '0x782629c9578889a9b8464f051f23843734f72599' })
  account;

  @ApiProperty({ example: 0 })
  totalUsd;

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
