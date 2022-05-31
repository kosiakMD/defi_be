import { Exclude, Expose, Type } from 'class-transformer';

import { BaseCollectionDto } from './base.collection.dto';
import { CollectionDisplayDataDto } from './collection.display.data.dto';
import { CollectionStatsDto as StatsDto } from './collection.stats.dto';

@Exclude()
export class CollectionDto extends BaseCollectionDto {
  @Expose()
  @Type(() => StatsDto)
  stats: StatsDto = null;

  @Expose()
  @Type(() => CollectionDisplayDataDto)
  displayData: CollectionDisplayDataDto = null;
}
