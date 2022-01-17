import { ApiProperty } from '@nestjs/swagger';

import { ChainInfoDto } from '.';

export class ChainBaseDto {
  @ApiProperty({ type: () => ChainInfoDto })
  chain: ChainInfoDto;

  @ApiProperty({ type: Number })
  totalChainPrice: number;

  @ApiProperty({ type: Number })
  totalChainPriceUsd: number;
}
