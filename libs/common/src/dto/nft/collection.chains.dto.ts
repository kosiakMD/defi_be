import { ApiProperty } from '@nestjs/swagger';

import { ChainCollectionsBaseDto } from '.';

export class CollectionChainsDto {
  @ApiProperty({ type: [ChainCollectionsBaseDto] })
  chains: ChainCollectionsBaseDto[];
}
