import { IsEthereumAddress, IsInt, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { Address } from '../types';

import { ERC20TokenDto } from './ERC20Token.dto';
import { ContractApproval } from '../interfaces';
import { ERC20Token } from './ERC20Token';

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
