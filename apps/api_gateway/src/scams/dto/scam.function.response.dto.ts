import { ApiProperty } from '@nestjs/swagger';

export class ScamFunctionResponseDto {
  @ApiProperty({ type: String, example: 'addLiquidityETH' })
  func: string;
  @ApiProperty({ type: Number, example: 441 })
  count: number;
}
