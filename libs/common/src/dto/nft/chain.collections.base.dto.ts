import { ApiProperty } from '@nestjs/swagger';

import { ChainInfoDto } from './chain.info.dto';
import { CollectionBaseDto } from './collection.base.dto';

export class ChainCollectionsBaseDto {
  @ApiProperty({ type: () => ChainInfoDto })
  chain: ChainInfoDto = null;

  @ApiProperty({ type: () => [CollectionBaseDto] })
  collections: CollectionBaseDto[] = null;
}
