import { ApiProperty } from '@nestjs/swagger';

import { EnumName, LiquidityChangeTypeEnum } from 'src/common/enum';

export class LiquidityChangeTransactionDto {
  @ApiProperty({
    enum: LiquidityChangeTypeEnum,
    enumName: EnumName.LiquidityChangeType,
    example: LiquidityChangeTypeEnum.addLiquidity,
  })
  type: LiquidityChangeTypeEnum;
}
