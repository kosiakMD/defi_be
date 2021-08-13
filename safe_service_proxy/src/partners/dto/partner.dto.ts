import { Exclude, Expose, plainToClass, Transform } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { LinksDto } from '../../common/dto/links.dto';
import { PartnerBaseDto } from 'src/common/dto/partner.base.dto';

import { FilesCountDto } from './files.count.dto';

@Exclude()
export class PartnerDto extends PartnerBaseDto {
  @Expose()
  @ApiProperty({ type: LinksDto })
  @Transform(({ obj }) => plainToClass(LinksDto, obj))
  links: LinksDto;

  @Expose()
  @ApiProperty({ type: FilesCountDto })
  @Transform(({ obj }) => plainToClass(FilesCountDto, obj))
  filesCount: FilesCountDto;
}
