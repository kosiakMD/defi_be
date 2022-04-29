import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { NftAssetDtoV1 } from '@app/common/dto/nft/nft.asset.dto.v1';

export class NftChainAssetsDto {
  @ApiProperty({ type: Number, example: 1 })
  chainId: number = null;

  @Type(() => NftAssetDtoV1)
  @ApiProperty({ type: () => [NftAssetDtoV1] })
  assets: NftAssetDtoV1[] = null;
}
