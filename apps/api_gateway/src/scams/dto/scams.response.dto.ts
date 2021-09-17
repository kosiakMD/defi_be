import { ApiProperty } from '@nestjs/swagger';

import { ScamDto } from './scam.dto';

export class ScamsResponseDto {
  @ApiProperty({ type: [ScamDto] })
  scams: ScamDto[];

  @ApiProperty({ type: Number, example: 1 })
  currentPage: number;

  @ApiProperty({ type: Number, example: 248 })
  lastPage: number;

  @ApiProperty({ type: Number, example: 2474 })
  count: number;
}
