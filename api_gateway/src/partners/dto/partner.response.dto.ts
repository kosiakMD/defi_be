import { ApiProperty } from '@nestjs/swagger';

import { LinksDto } from '../../common/DTO/Links.dto';
import { PartnerBaseDto } from 'src/common/DTO/PartnerBase.dto';

import { FilesCountDto } from './files.count.dto';

export class PartnerResponseDto extends PartnerBaseDto {
  @ApiProperty({ type: LinksDto })
  links: LinksDto;

  @ApiProperty({ type: FilesCountDto })
  filesCount: FilesCountDto;
}
