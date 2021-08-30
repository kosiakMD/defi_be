import { ApiProperty } from '@nestjs/swagger';

import { LinksDto } from 'src/common/DTO/Links.dto';
import { PartnerBaseDto } from 'src/common/DTO/PartnerBase.dto';

export class ScamPartnerDto extends PartnerBaseDto {
  @ApiProperty({ type: LinksDto })
  links: LinksDto;
}
