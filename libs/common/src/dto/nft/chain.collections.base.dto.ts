import { ApiProperty } from '@nestjs/swagger';

import { ChainInfoDto, CollectionBaseDto } from '.';

export class ChainCollectionsBaseDto {
  @ApiProperty({ type: () => ChainInfoDto })
  chain: ChainInfoDto;

  @ApiProperty({ type: () => [CollectionBaseDto] })
  collections: CollectionBaseDto[];
}
