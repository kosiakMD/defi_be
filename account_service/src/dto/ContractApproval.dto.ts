import { IsEthereumAddress, IsInt, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ERC20TokenDto } from './ERC20Token.dto';
import { ChainIdEnum } from 'src/common/enum';
import { Address, ContractApproval, ERC20Token } from 'src/common/interfaces';

export default class ContractApprovalDto implements ContractApproval {
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
