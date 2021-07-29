import { ApiProperty } from '@nestjs/swagger';

enum LiquidityChangeType {
  addLiquidity = 'addLiquidity',
  removeLiquidity = 'removeLiquidity',
}

export class LiquidityChangeTransactionDto {
  @ApiProperty({
    enum: LiquidityChangeType,
    enumName: 'LiquidityChangeType',
    example: LiquidityChangeType.addLiquidity,
  })
  type: LiquidityChangeType;
}
