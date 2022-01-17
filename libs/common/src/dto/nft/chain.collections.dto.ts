import { ApiProperty } from '@nestjs/swagger';

import { CollectionDto } from '.';
import { ChainBaseDto } from './chain.base.dto';

export class ChainCollectionsDto extends ChainBaseDto {
  @ApiProperty({ type: () => [CollectionDto] })
  collections: CollectionDto[];
}
