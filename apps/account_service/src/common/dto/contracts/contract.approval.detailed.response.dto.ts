import { ApiProperty } from '@nestjs/swagger';

import { ContractProjectDto } from './contract.project.dto';
import { ContractTokenDto } from './contract.token.dto';

export class ContractApprovalDetailedResponseDto {
  @ApiProperty({ example: 1})
  chainId: number;

  @ApiProperty({
    type: String,
    example: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffff6ad7398b',
  })
  allowance: string;

  @ApiProperty({ type: Number, example: 12452359 })
  blockNumber: number;

  @ApiProperty({ type: Number, example: 1621260790 })
  blockTimestamp: number;

  @ApiProperty({ type: ContractProjectDto })
  project: ContractProjectDto;

  @ApiProperty({ type: String, example: '0x42d7025938bec20b69cbae5a77421082407f053a' })
  spender: string;

  @ApiProperty({ type: ContractTokenDto })
  token: ContractTokenDto;
}
