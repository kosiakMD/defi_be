import { ApiProperty } from '@nestjs/swagger';

import { ChainInfoDto } from './chain.info.dto';

export class ChainBaseDto {
  @ApiProperty({ type: () => ChainInfoDto })
  chain: ChainInfoDto = null;

  @ApiProperty({ type: Number })
  totalChainPrice: number = null;

  @ApiProperty({ type: Number })
  totalChainPriceUsd: number = null;
}
