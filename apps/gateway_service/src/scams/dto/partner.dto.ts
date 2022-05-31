import { ApiProperty } from '@nestjs/swagger';

import { LinksDto } from '@app/common/dto/links.dto';
import { PartnerBaseDto } from '@app/common/dto/partner-base.dto';

export class ScamPartnerDto extends PartnerBaseDto {
  @ApiProperty({ type: LinksDto })
  links: LinksDto;
}
