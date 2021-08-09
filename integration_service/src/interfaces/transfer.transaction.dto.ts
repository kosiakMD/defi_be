import { SwapTokenDto } from 'src/uniswap/dto/swap.token.dto';

import { ApiProperty } from '@nestjs/swagger';

import { DirectionEnum, EnumName, TransactionTypeEnum } from 'src/common/enum';

export class TransferTransactionDto {
  @ApiProperty({
    enum: TransactionTypeEnum,
    enumName: EnumName.TransactionType,
    example: TransactionTypeEnum.transfer,
  })
  type: TransactionTypeEnum.transfer;

  @ApiProperty({ enum: DirectionEnum, enumName: EnumName.Direction, example: DirectionEnum.in })
  direction: DirectionEnum;

  @ApiProperty({ type: [SwapTokenDto] })
  token: SwapTokenDto[];
}
