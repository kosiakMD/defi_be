import { ApiProperty } from '@nestjs/swagger';

import { LiquidityChangeTypeEnum } from 'src/common/enum';

export class LiquidityChangeTransactionDto {
  @ApiProperty({
    enum: LiquidityChangeTypeEnum,
    enumName: 'LiquidityChangeType',
    example: LiquidityChangeTypeEnum.addLiquidity,
  })
  type: LiquidityChangeTypeEnum;
}
