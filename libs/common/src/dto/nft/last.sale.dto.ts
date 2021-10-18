import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { PaymentTokenDto } from './payment.token.dto';

@Exclude()
export class LastSaleDto {
  @Expose({ name: 'total_price' })
  @ApiProperty({ example: '50000' })
  price: string;

  @Expose({ name: 'payment_token' })
  @Type(() => PaymentTokenDto)
  @ApiProperty({ type: PaymentTokenDto })
  paymentToken: PaymentTokenDto;

  @Expose({ name: 'event_timestamp' })
  @ApiProperty({ example: '2021-10-07T19:19:59' })
  date: string;
}
