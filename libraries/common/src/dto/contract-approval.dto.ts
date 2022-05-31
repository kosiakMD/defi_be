import { IsEthereumAddress, IsInt, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { Address, ContractApproval, ERC20Token } from '@app/common';

import { ERC20TokenDto } from './erc20-token.dto';

export default class ContractApprovalDto implements ContractApproval {
  @ApiProperty({ type: String })
  @IsEthereumAddress()
  contractAddress: Address;

  @ApiProperty({ type: String })
  @IsString()
  amount: string;

  @ApiProperty({ type: Number })
  @IsInt()
  blockTimestamp: number;

  @ApiProperty({ type: ERC20TokenDto })
  token: ERC20Token;
}
