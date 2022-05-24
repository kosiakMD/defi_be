import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { NftAssetDtoV1 } from '@app/common/dto/nft/nft.asset.dto.v1';

export class NftAssetsResponseDtoV1 {
  @Type(() => NftAssetDtoV1)
  @ApiProperty({ type: () => [NftAssetDtoV1] })
  assets: NftAssetDtoV1[] = null;

  @ApiProperty({ type: Number })
  totalAccountPrice: number = null;

  @ApiProperty({ type: Number })
  totalAccountPriceUsd: number = null;

  // total number of available pages
  @ApiProperty({ type: Number })
  pages: number;

  // Total number of available results
  @ApiProperty({ type: Number })
  total: number;
}
