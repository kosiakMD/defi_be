import { ApiProperty } from '@nestjs/swagger';

import { PartnerBaseDto } from '@app/common/dto/PartnerBase.dto';

import { LinksDto } from '../../common/DTO/Links.dto';

import { FilesCountDto } from './files.count.dto';

export class PartnerResponseDto extends PartnerBaseDto {
  @ApiProperty({ type: LinksDto })
  links: LinksDto;

  @ApiProperty({ type: FilesCountDto })
  filesCount: FilesCountDto;
}
