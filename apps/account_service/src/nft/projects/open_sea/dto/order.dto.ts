import { Exclude, Expose, Type } from 'class-transformer';

import { MakerDto, PaymentTokenDto } from '.';

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
