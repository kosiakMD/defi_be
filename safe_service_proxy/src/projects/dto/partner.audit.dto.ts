import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AuditDto } from '../../common/dto/audit.dto';
import { PartnerBaseDto } from 'src/common/dto/partner.base.dto';

@Exclude()
export class PartnerAuditDto extends AuditDto {
  @Expose()
  @ApiProperty({ type: PartnerBaseDto })
  partner: PartnerBaseDto;
}
