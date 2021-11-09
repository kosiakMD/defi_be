import { Exclude, Expose, Type } from 'class-transformer';

import { PaymentTokenDto } from '.';

@Exclude()
export class LastSaleDto {
  @Expose({ name: 'total_price' })
  price: string;

  @Expose({ name: 'payment_token' })
  @Type(() => PaymentTokenDto)
  paymentToken: PaymentTokenDto;
}
