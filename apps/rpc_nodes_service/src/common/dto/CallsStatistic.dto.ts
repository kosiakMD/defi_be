import { IsNumber } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CallsStatistic {
  constructor() {
    this.fail = 0;
    this.success = 0;
    this.successRating = 0;
  }
  @ApiProperty({ type: Number, required: true, example: 12 })
  @IsNumber()
  fail: number;

  @ApiProperty({ type: Number, required: true, example: 144 })
  @IsNumber()
  success: number;

  @ApiProperty({ type: Number, required: true, example: 132 })
  @IsNumber()
  successRating: number;
}
