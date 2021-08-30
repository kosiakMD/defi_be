import { Exclude, Expose, plainToClass, Transform } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { PartnerBaseDto } from 'src/common/dto/partner.base.dto';

import { ScamLinksDto } from './scam.links.dto';

@Exclude()
export class PartnerLinksDto extends PartnerBaseDto {
  @Expose()
  @ApiProperty({ type: ScamLinksDto })
  @Transform(({ obj }) => plainToClass(ScamLinksDto, obj))
  links: ScamLinksDto;
}
