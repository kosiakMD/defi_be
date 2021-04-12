import { ApiProperty } from '@nestjs/swagger';

export default class APY implements APY {
  @ApiProperty({ type: Number, example: 42.96448987689843 })
  day: number;

  @ApiProperty({ type: Number, example: 40.23741031634904 })
  week: number;

  @ApiProperty({ type: Number, example: 41.35642187142753 })
  month: number;
}
