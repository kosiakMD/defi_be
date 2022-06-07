import { Exclude, Expose, Type } from 'class-transformer';

import { CollectionDisplayDataDto } from './collection.display.data.dto';
import { CollectionStatsDto } from './collection.stats.dto';
import { ContractDto } from './contract.dto';

@Exclude()
export class BaseCollectionDto {
  @Expose()
  name: string = null;

  @Expose()
  symbol: string = null;

  @Expose()
  description: string = null;

  @Expose()
  @Type(() => CollectionStatsDto)
  stats: CollectionStatsDto = null;

  @Expose({ name: 'external_url' })
  externalUrl: string = null;

  @Expose({ name: 'discord_url' })
  discordUrl: string = null;

  @Expose({ name: 'banner_image_url' })
  bannerImageUrl: string = null;

  @Expose({ name: 'telegram_url' })
  telegramUrl: string = null;

  @Expose({ name: 'wiki_url' })
  wikiUrl: string = null;

  @Expose({ name: 'medium_username' })
  mediumUsername: string = null;

  @Expose({ name: 'twitter_username' })
  twitterUsername: string = null;

  @Expose({ name: 'instagram_username' })
  instagramUsername: string = null;

  @Expose({ name: 'asset_contract' })
  @Type(() => ContractDto)
  contract: ContractDto = null;

  @Expose()
  permalink: string = null;

  @Expose()
  @Type(() => CollectionDisplayDataDto)
  displayData: CollectionDisplayDataDto = null;

  @Expose({ name: 'image_url' })
  imageUrl: string = null;

  @Expose()
  slug: string = null;
}
