import { ApiProperty } from '@nestjs/swagger';

import { LinksDto } from '@app/common/dto';
import { PartnerBaseDto } from '@app/common/dto';

export class ScamPartnerDto extends PartnerBaseDto {
  @ApiProperty({ type: LinksDto })
  links: LinksDto;
}
