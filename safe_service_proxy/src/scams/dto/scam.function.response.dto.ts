import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class ScamFunctionResponseDto {
  @Expose()
  @ApiProperty({ type: String, example: 'addLiquidityETH' })
  func: string;

  @Expose()
  @ApiProperty({ type: Number, example: 441 })
  count: number;
}
