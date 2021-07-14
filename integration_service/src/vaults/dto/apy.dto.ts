import { ApiProperty } from '@nestjs/swagger';

export class APYDto {
  @ApiProperty({ type: Number, example: 0.09777803637248064 })
  day: number;

  @ApiProperty({ type: Number, example: 2.974081939662953 })
  week: number;

  @ApiProperty({ type: Number, example: 35.68898327595544 })
  month: number;
}
