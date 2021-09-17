import { ApiProperty } from '@nestjs/swagger';

export class APYDto {
  @ApiProperty({ type: Number, example: 0.4295799177429349 })
  day: number;

  @ApiProperty({ type: Number, example: 0.3722386597825641 })
  week: number;

  @ApiProperty({ type: Number, example: 1.6033623124787402 })
  month: number;
}
