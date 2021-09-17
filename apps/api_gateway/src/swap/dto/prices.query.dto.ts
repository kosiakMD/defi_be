import { ApiProperty } from '@nestjs/swagger';

import { NetworkEnum } from '../const';
import { SwapPricesQuery } from '../interfaces';

export class SwapPricesQueryDto implements SwapPricesQuery {
  @ApiProperty({ type: String, example: '0x975F10314CdFA9256012335719d3085435962439' })
  from: string;

  @ApiProperty({
    type: String,
    example: '0x006699d34AA3013605d468d2755A2Fe59A16B12B',
  })
  to: string;

  @ApiProperty({ type: Number, example: 0.002235 })
  amount: number;

  @ApiProperty({ type: String, example: 'side idk' })
  side: string;

  @ApiProperty({
    enum: NetworkEnum,
    enumName: 'NetworkEnum',
    example: NetworkEnum.true,
    default: NetworkEnum.true,
    required: false,
  })
  network: NetworkEnum;
}
