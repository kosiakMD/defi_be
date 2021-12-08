import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum } from '@app/common/enum';

import { TransactionCovalent } from '../transactions.interfaces';

export class TransactionsCovalentDto implements TransactionCovalent {
  @ApiProperty({
    enum: ChainIdEnum,
    enumName: 'ChainIdEnum',
    example: ChainIdEnum.eth,
  })
  chainId: ChainIdEnum;

  @ApiProperty({ type: Number, example: 11782395 })
  blockNumber: number;

  @ApiProperty({
    type: String,
    example: '0xfef3343fbba1520072171170ef0aa28ff999eff3cbd924fa3d038587651f1eef',
  })
  blockHash: string;

  @ApiProperty({
    type: String,
    example: '0xfef3343fbba1520072171170ef0aa28ff999eff3cbd924fa3d038587651f1eef',
  })
  hash: string;

  @ApiProperty({ type: String, example: '2021-02-03T09:10:42Z' })
  timeStamp: string;

  @ApiProperty({ type: String, example: '420499960000000000' })
  value: string;

  @ApiProperty({ type: Number, example: 696.1136097466455 })
  valueInCurrency: number;

  @ApiProperty({ type: String, example: 'USD' })
  currency: string;

  @ApiProperty({ type: Number, example: 183000000000 })
  gasPrice: number;

  @ApiProperty({ type: Number, example: 21000 })
  gasUsed: number;

  @ApiProperty({ type: String, example: '0' })
  isError: string;
}
