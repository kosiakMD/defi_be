import { ApiProperty } from '@nestjs/swagger';

import { ChainBaseDto } from './chain.base.dto';
import { CollectionDto } from './collection.dto';

export class ChainCollectionsDto extends ChainBaseDto {
  @ApiProperty({ type: () => [CollectionDto] })
  collections: CollectionDto[] = null;
}
