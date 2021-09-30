import { ApiProperty } from '@nestjs/swagger';

export class FilesCountDto {
  @ApiProperty({ type: Number, example: 485 })
  partnersAudits: number;

  @ApiProperty({ type: Number, example: 4 })
  partnersScams: number;
}
