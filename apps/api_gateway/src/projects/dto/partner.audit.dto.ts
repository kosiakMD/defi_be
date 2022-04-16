import { ApiProperty } from '@nestjs/swagger';

import { PartnerBaseDto } from '@app/common/dto';

import { AuditDto } from '../../common/DTO/Audit.dto';

export class PartnerAuditDto extends AuditDto {
  @ApiProperty({ type: PartnerBaseDto })
  partner: PartnerBaseDto;
}
