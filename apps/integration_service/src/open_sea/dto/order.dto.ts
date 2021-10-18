import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { PaymentTokenDto } from '@app/common/dto/nft';

@Exclude()
export class OrderDto {
  @Expose({ name: 'current_price' })
  @ApiProperty({ example: '500000000' })
  currentPrice: string;

  @Expose({ name: 'payment_token_contract' })
  @Type(() => PaymentTokenDto)
  @ApiProperty({ type: PaymentTokenDto })
  paymentToken: PaymentTokenDto;
}
