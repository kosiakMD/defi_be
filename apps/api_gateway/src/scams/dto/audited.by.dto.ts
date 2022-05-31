import { ApiProperty } from '@nestjs/swagger';

import { AuditDto } from '@app/common/dto/Audit.dto';

import { ScamPartnerDto } from './partner.dto';

export class AuditedByDto extends AuditDto {
  @ApiProperty({ type: ScamPartnerDto })
  partner: ScamPartnerDto;
}
