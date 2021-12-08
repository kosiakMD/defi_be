import { Exclude, Expose, Type } from 'class-transformer';

import { MakerDto } from './maker.dto';
import { PaymentTokenDto } from './payment.token.dto';

@Exclude()
export class OrderDto {
  @Expose({ name: 'closing_date' })
  closingDate: string;

  @Expose({ name: 'current_price' })
  currentPrice: string;

  @Expose({ name: 'payment_token_contract' })
  @Type(() => PaymentTokenDto)
  paymentToken: PaymentTokenDto;

  @Expose()
  @Type(() => MakerDto)
  maker: MakerDto;
}
