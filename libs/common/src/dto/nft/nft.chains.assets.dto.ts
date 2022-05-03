import { ApiProperty } from '@nestjs/swagger';

import { NftChainAssetsDto } from '@app/common/dto/nft/nft.chain.assets.dto';

export class NftChainsAssetsDto {
  @ApiProperty({ type: [NftChainAssetsDto] })
  chains: NftChainAssetsDto[] = null;

  @ApiProperty({ type: Number })
  totalAccountPrice: number = null;

  @ApiProperty({ type: Number })
  totalAccountPriceUsd: number = null;
}
