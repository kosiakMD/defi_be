// eslint-disable-next-line max-classes-per-file
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { AccountTokenBalance } from '../account/account.interfaces';
import { splitToArray } from '../utils/transform';
import { Balance, BalanceToken } from './balances.interfaces';
import { ChainIdEnum } from 'src/common/enum';
import { Address, Chains, ERC20Token } from 'src/common/interfaces';

export class BalancesQueryDto {
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

export class BalanceTokenDto implements BalanceToken {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chainId: ChainIdEnum;
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
  @ApiProperty({ type: String, example: 'ETH' })
  symbol: string;
  @ApiProperty({ type: String, example: 'Ether' })
  name: string;
  @ApiProperty({ type: String, example: '0x0000000000000000000000000000000000000000' })
  address: string;
  @ApiProperty({ type: Boolean, example: false, required: false })
  isLp: boolean;
}

export class AccountTokenBalanceDto implements AccountTokenBalance {
  @ApiProperty({ type: String, example: '95480719361477141' })
  amount: string;
  @ApiProperty({ type: String, example: '0x782629c9578889a9b8464f051f23843734f72599' })
  account: string;
  @ApiProperty({ type: Number, example: 0.09548071936147715 })
  decimalsAmount: number;
  @ApiProperty({ type: Number, example: 0, required: false })
  tokenPriceUSD?: number;
  @ApiProperty({ type: Number, example: 0, required: false })
  totalPriceUSD?: number;
  @ApiProperty({ type: BalanceTokenDto })
  token: ERC20Token;
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
