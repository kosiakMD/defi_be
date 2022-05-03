import { ApiProperty } from '@nestjs/swagger';

import { NftCollectionBaseDto } from '@app/common/dto/nft/nft.collection.base.dto';

export class NftChainCollectionsDto {
  @ApiProperty({ type: Number, example: 1 })
  chainId: number = null;

  @ApiProperty({ type: () => [NftCollectionBaseDto] })
  collections: NftCollectionBaseDto[] = null;
}
