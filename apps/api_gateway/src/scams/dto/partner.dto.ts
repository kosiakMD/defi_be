import { ApiProperty } from '@nestjs/swagger';

import { LinksDto } from '@app/common/dto/Links.dto';
import { PartnerBaseDto } from '@app/common/dto/PartnerBase.dto';

export class ScamPartnerDto extends PartnerBaseDto {
  @ApiProperty({ type: LinksDto })
  links: LinksDto;
}
