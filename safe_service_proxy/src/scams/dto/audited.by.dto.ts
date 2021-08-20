import { Exclude, Expose, plainToClass, Transform } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AuditDto } from 'src/common/dto/audit.dto';
import { PartnerLinksDto } from 'src/common/dto/partner.links.dto';

@Exclude()
export class AuditedByDto extends AuditDto {
  @Expose()
  @ApiProperty({ type: PartnerLinksDto })
  @Transform(({ obj }) => plainToClass(PartnerLinksDto, obj.partner))
  partner: PartnerLinksDto;
}
