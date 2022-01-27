import { ApiProperty } from '@nestjs/swagger';

import { ChainCollectionsDto } from '.';

export class ChainsDto {
  @ApiProperty({ type: [ChainCollectionsDto] })
  chains: ChainCollectionsDto[];

  @ApiProperty({ type: Number })
  totalAccountPrice: number;

  @ApiProperty({ type: Number })
  totalAccountPriceUsd: number;
}
