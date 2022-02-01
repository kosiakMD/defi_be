// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum } from '@app/common/enum';
import { ERC20Token } from '@app/common/interfaces';

import { Balance, BalanceToken } from '../interfaces/balances.interfaces';

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

export class AccountTokenBalanceDto {
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

export class ErrorMessageDto {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.bsc })
  chainId: ChainIdEnum;

  @ApiProperty({ type: Number, example: 502 })
  statusCode: number;

  @ApiProperty({ type: String, example: 'Connection to web3 provider failed' })
  message: string;
}

export class BalanceDto implements Balance {
  @ApiProperty({ type: Number, example: 0 })
  totalUsd: number;

  @ApiProperty({ type: AccountTokenBalanceDto, isArray: true })
  tokens: {
    account: string;
    amount: string;
    decimalsAmount: number;
    tokenPriceUSD?: number;
    totalPriceUSD?: number;
    token: ERC20Token;
  };

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

interface ErrorMessage {
  chainId: number;
  statusCode: number;
  message: string;
}
