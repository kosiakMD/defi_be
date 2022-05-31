import { ApiProperty } from '@nestjs/swagger';

import { PartnerBaseDto } from '@app/common/dto/partner-base.dto';

import { LinksDto } from '../../common/dto/links.dto';

import { FilesCountDto } from './files.count.dto';

export class PartnerResponseDto extends PartnerBaseDto {
  @ApiProperty({ type: LinksDto })
  links: LinksDto;

  @ApiProperty({ type: FilesCountDto })
  filesCount: FilesCountDto;
}
