// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { PoolAPY, VaultAPY } from '../interfaces';

export class APYDto {
  @ApiProperty({ type: Number, example: 0.09777803637248064 })
  day: number;

  @ApiProperty({ type: Number, example: 2.974081939662953 })
  week: number;

  @ApiProperty({ type: Number, example: 35.68898327595544 })
  month: number;
}

export class PoolAPYDTO implements PoolAPY {
  @ApiProperty({ type: Number, example: 42.96448987689843 })
  day: number;

  @ApiProperty({ type: Number, example: 40.23741031634904 })
  week: number;

  @ApiProperty({ type: Number, example: 41.35642187142753 })
  month: number;
}

export class VaultAPYDTO implements VaultAPY {
  @ApiProperty({ type: Number, example: 38.82604263085921 })
  year: number;

  @ApiProperty({ type: Number, example: 3.235503552571601 })
  month: number;

  @ApiProperty({ type: Number, example: 0.10637271953660059 })
  day: number;
}
