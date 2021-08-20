import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class FilesCountDto {
  @Expose({ name: 'partnerFilesCount' })
  @ApiProperty({ type: Number, example: 485 })
  partnersAudits: number;

  @Expose({ name: 'partnerScamsFilesCount' })
  @ApiProperty({ type: Number, example: 4 })
  partnersScams: number;
}
