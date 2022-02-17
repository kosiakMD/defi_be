import { Exclude, Expose, Type } from 'class-transformer';

import { PaymentTokenDto } from './payment.token.dto';

@Exclude()
export class LastSaleDto {
  @Expose({ name: 'total_price' })
  price: string = null;

  @Expose({ name: 'payment_token' })
  @Type(() => PaymentTokenDto)
  paymentToken: PaymentTokenDto = null;
}
