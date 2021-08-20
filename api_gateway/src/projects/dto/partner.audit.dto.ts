import { ApiProperty } from '@nestjs/swagger';

import { AuditDto } from '../../common/DTO/Audit.dto';
import { PartnerBaseDto } from 'src/common/DTO/PartnerBase.dto';

export class PartnerAuditDto extends AuditDto {
  @ApiProperty({ type: PartnerBaseDto })
  partner: PartnerBaseDto;
}
