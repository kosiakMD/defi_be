// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { AccountTokenBalance } from '../account/account.interfaces';
import { Address, Chains, ERC20Token } from '../common/interfaces';
import { splitToArray } from '../utils/transform';
import { Balance, BalanceToken } from './balances.interfaces';

export class BalancesQueryDto {
  @IsNotEmpty()
  @Transform(({ value }) => splitToArray(value))
  @IsString({ each: true })
  addresses: Address[];

  @IsOptional()
  @Transform(({ value }) => splitToArray(value).map((x) => parseInt(x, 10)))
  @IsInt({ each: true })
  chains: Chains;
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
  token: ERC20Token;
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
