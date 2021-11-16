import { Exclude, Expose, Type } from 'class-transformer';

import { BaseCollectionDto, CollectionStatsDto as StatsDto } from '.';

@Exclude()
export class CollectionDto extends BaseCollectionDto {
  @Expose()
  @Type(() => StatsDto)
  stats: StatsDto;
}
