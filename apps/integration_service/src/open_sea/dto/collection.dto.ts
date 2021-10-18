import { Exclude, Expose, Type } from 'class-transformer';

import {
  CollectionStatsDto as StatsDto,
  CollectionDto as BaseCollectionDto,
} from '@app/common/dto/nft';

@Exclude()
export class CollectionDto extends BaseCollectionDto {
  @Expose()
  @Type(() => StatsDto)
  stats: StatsDto;
}
