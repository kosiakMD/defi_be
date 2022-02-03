// eslint-disable-next-line max-classes-per-file
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { AccountTokenBalance, Address, BalanceToken, Chains, ErrorMessage } from '@app/common';
import { ChainIdEnum } from '@app/common/enum';
import { ERC20Token } from '@app/common/interfaces';
import { splitToArray } from '@app/common/utils';
import { splitToAddressesArray } from '@app/common/utils/addresses';

export class BalancesQueryDto {
  @IsNotEmpty()
  @Transform(({ value }: any) => splitToAddressesArray(value as any))
  @IsString({ each: true })
  addresses: Address[];

  @IsOptional()
  @Transform(({ value }: any) => {
    return splitToArray(value as any).map((x) => parseInt(x, 10));
  })
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

export class ErrorMessageDto implements ErrorMessage {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.bsc })
  chainId: ChainIdEnum;

  @ApiProperty({ type: Number, example: 502 })
  statusCode: number;

  @ApiProperty({ type: String, example: 'Connection to web3 provider failed' })
  message: string;
}

export class BalanceDto {
  @ApiProperty({ type: Number, example: 0 })
  totalUsd: number;

  @ApiProperty({ type: AccountTokenBalanceDto, isArray: true })
  tokens: AccountTokenBalance;

  @ApiProperty({ type: [ErrorMessageDto] })
  errors?: ErrorMessage[];
}

export class BalancesResponseDto {
  @ApiProperty({
    description: 'User address which comes as param',
    type: BalanceDto,
  })
  '0x782629c9578889a9b8464f051f23843734f72599': BalanceDto;
}
