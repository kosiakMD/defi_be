import { ApiProperty } from '@nestjs/swagger';

import { ChainCollectionsDto } from './chain.collections.dto';

export class ChainsDto {
  @ApiProperty({ type: [ChainCollectionsDto] })
  chains: ChainCollectionsDto[] = null;

  @ApiProperty({ type: Number })
  totalAccountPrice: number = null;

  @ApiProperty({ type: Number })
  totalAccountPriceUsd: number = null;
}
