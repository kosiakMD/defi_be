import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsInt, IsString } from 'class-validator';

import { Address, ContractApproval, ERC20Token } from '../interfaces';
import { ERC20TokenDto } from './ERC20Token.dto';

export default class ContractApprovalDto implements ContractApproval {
  @ApiProperty({ type: Number })
  @IsEthereumAddress()
  chainId: number;

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
  tokenAddress: ERC20Token = new ERC20TokenDto();
}
