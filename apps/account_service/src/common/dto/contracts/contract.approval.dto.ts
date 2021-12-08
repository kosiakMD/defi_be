import { IsEthereumAddress, IsInt, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum } from '@app/common/enum';
import { ContractApproval, ERC20Token } from '@app/common/interfaces';
import { Address } from '@app/common/types';

import { ERC20TokenDto } from '../ERC20Token.dto';

export default class ContractApprovalDto implements ContractApproval {
  // TODO: TBD
  token: ERC20Token;

  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  @IsEthereumAddress()
  chainId: ChainIdEnum;

  @ApiProperty({ type: String, example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' })
  @IsEthereumAddress()
  contractAddress: Address;

  @ApiProperty({ type: String, example: '2502.751309' })
  @IsString()
  amount: string;

  @ApiProperty({ type: Number, example: 1626178227726 })
  @IsInt()
  blockTimestamp: number;

  @ApiProperty({ type: ERC20TokenDto })
  tokenAddress: ERC20Token = new ERC20TokenDto();
}
