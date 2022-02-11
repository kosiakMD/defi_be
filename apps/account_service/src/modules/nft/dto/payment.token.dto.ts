import { ethToken } from 'apps/account_service/src/common/constant/tokens';
import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { Address } from '@app/common';

@Exclude()
export class PaymentTokenDto {
  @Expose()
  @ApiProperty({ example: ethToken.address })
  address: Address;

  @Expose()
  @ApiProperty({ example: ethToken.name })
  name: string;

  @Expose()
  @ApiProperty({ example: ethToken.symbol })
  symbol: string;

  @Expose()
  @ApiProperty({ example: ethToken.decimals })
  decimals: number;

  @Expose({ name: 'eth_price' })
  @ApiProperty({ example: '0.8' })
  priceEth: string;

  @Expose({ name: 'usd_price' })
  @ApiProperty({ example: '3650.098' })
  priceUsd: string;
}
