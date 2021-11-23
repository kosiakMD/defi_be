import { ApiProperty } from '@nestjs/swagger';

import { ChainInfoDto, CollectionDto } from '.';

export class ChainDto {
  @ApiProperty({ type: () => ChainInfoDto })
  chain: ChainInfoDto;

  @ApiProperty({ type: Number })
  totalChainPrice: number;

  @ApiProperty({ type: Number })
  totalChainPriceUsd: number;

  @ApiProperty({ type: () => [CollectionDto] })
  collections: CollectionDto[];
}
