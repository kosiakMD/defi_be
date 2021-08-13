import { PartnerResponseDto } from 'src/partners/dto';

import { AuditDto } from 'src/common/DTO/Audit.dto';

export class AuditedByDto extends AuditDto {
  partner: PartnerResponseDto;
}
