import { ApiProperty } from '@nestjs/swagger';

import { PartnerBaseDto } from '@app/common/dto/partner-base.dto';

import { AuditDto } from '../../common/dto/audit.dto';

export class PartnerAuditDto extends AuditDto {
  @ApiProperty({ type: PartnerBaseDto })
  partner: PartnerBaseDto;
}
