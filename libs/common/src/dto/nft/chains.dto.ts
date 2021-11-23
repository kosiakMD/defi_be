import { ApiProperty } from '@nestjs/swagger';

import { ChainDto } from '.';

export class ChainsDto {
  @ApiProperty({ type: [ChainDto] })
  chains: ChainDto[];

  @ApiProperty({ type: Number })
  totalAccountPrice: number;

  @ApiProperty({ type: Number })
  totalAccountPriceUsd: number;
}
