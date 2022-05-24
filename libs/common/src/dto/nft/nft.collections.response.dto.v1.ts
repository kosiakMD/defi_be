import { ApiProperty } from '@nestjs/swagger';

import { NftCollectionBaseDto } from '@app/common/dto/nft/nft.collection.base.dto';

export class NftCollectionsResponseDtoV1 {
  @ApiProperty({ type: () => [NftCollectionBaseDto] })
  collections: NftCollectionBaseDto[] = null;
}
