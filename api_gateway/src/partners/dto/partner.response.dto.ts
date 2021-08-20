import { ApiProperty } from '@nestjs/swagger';

import { PartnerBaseDto } from 'src/common/DTO/PartnerBase.dto';

import { LinksDto } from './files.count.dto';
import { FilesCountDto } from './links.dto';

export class PartnerResponseDto extends PartnerBaseDto {
  @ApiProperty({ type: LinksDto })
  links: LinksDto;

  @ApiProperty({ type: FilesCountDto })
  filesCount: FilesCountDto;
}
