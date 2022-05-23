import { ApiProperty } from '@nestjs/swagger';

export class ContractAnalyseRequestDto {
  @ApiProperty({ type: String })
  address: string;
}
