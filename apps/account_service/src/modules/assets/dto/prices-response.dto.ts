import { ApiProperty } from '@nestjs/swagger';

export class PriceResponseDto<T> {
  constructor(prices) {
    this.prices = prices;
  }

  @ApiProperty({ type: Object })
  prices: T;
}
