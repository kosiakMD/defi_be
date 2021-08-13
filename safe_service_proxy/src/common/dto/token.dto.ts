import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { NetworkDto } from './network.dto';

@Exclude()
export class TokenDto {
  @Expose()
  @ApiProperty({ type: Number, example: 1228 })
  id: number;

  @Expose({ name: 'token_address' })
  @ApiProperty({ type: String, example: '0xaAa5B9e6c589642f98a1cDA99B9D024B8407285A' })
  address: string;

  @Expose({ name: 'token_ticker' })
  @ApiProperty({ type: String, example: 'TITAN' })
  ticker: string;

  @Expose({ name: 'networks' })
  @ApiProperty({ type: NetworkDto })
  network: NetworkDto;
}
