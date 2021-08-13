import { Exclude, Expose, plainToClass, Transform } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { LinksDto } from './links.dto';
import { PartnerBaseDto } from './partner.base.dto';

@Exclude()
export class PartnerLinksDto extends PartnerBaseDto {
  @Expose()
  @ApiProperty({ type: LinksDto })
  @Transform(({ obj }) => plainToClass(LinksDto, obj))
  links: LinksDto;
}
