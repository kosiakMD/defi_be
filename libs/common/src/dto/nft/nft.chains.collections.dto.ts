import { ApiProperty } from '@nestjs/swagger';

import { NftChainCollectionsDto } from '@app/common/dto/nft/nft.chain.collections.dto';

export class NftChainsCollectionsDto {
  @ApiProperty({ type: [NftChainCollectionsDto] })
  chains: NftChainCollectionsDto[] = null;
}
