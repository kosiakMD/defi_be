import { ApiProperty } from '@nestjs/swagger';

import { ChainCollectionsBaseDto } from './chain.collections.base.dto';

export class CollectionChainsDto {
  @ApiProperty({ type: [ChainCollectionsBaseDto] })
  chains: ChainCollectionsBaseDto[] = null;
}
