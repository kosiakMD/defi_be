import { ApiProperty } from '@nestjs/swagger';

export class PriceAbleDto {
  @ApiProperty({ type: Number, required: false, example: 2001.6545766079778 })
  priceUSD?: number;
}
