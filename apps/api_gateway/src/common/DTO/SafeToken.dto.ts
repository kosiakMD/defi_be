import { ApiProperty } from '@nestjs/swagger';

import { NetworkBaseDto } from './NetworkBase.dto';

export class SafeTokenDto {
  @ApiProperty({ type: Number, example: 1228 })
  id: number;

  @ApiProperty({ type: String, example: '0xaAa5B9e6c589642f98a1cDA99B9D024B8407285A' })
  address: string;

  @ApiProperty({ type: String, example: 'TITAN' })
  ticker: string;

  @ApiProperty({ type: NetworkBaseDto })
  network: NetworkBaseDto;
}
