import { ApiProperty } from '@nestjs/swagger';

import { AuditDto } from 'src/common/DTO/Audit.dto';

import { ScamPartnerDto } from './partner.dto';

export class AuditedByDto extends AuditDto {
  @ApiProperty({ type: ScamPartnerDto })
  partner: ScamPartnerDto;
}
