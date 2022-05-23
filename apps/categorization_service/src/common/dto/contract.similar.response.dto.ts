import { ApiProperty } from '@nestjs/swagger';

import { ContractSimilarDto } from './contract.similar.dto';

export class ContractSimilarResponseDto {
  @ApiProperty({ type: () => [ContractSimilarDto] })
  contracts?: ContractSimilarDto[] = [];
}
