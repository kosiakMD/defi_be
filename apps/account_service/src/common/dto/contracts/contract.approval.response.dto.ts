import { ApiProperty } from '@nestjs/swagger';

import { ContractApprovalDetailedResponseDto } from './contract-approval-detailed-response.dto';

export class ContractApprovalResponseDto {
  @ApiProperty({ type: ContractApprovalDetailedResponseDto, isArray: true })
  '0x94dfce828c3daaf6492f1b6f66f9a1825254d24b': ContractApprovalDetailedResponseDto;
}
