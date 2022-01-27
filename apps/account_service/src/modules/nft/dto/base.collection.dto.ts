import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class BaseCollectionDto {
  @Expose()
  name: string;

  @Expose()
  symbol: string;

  @Expose()
  description: string;

  @Expose({ name: 'external_url' })
  externalUrl: string;

  @Expose({ name: 'banner_image_url' })
  bannerImageUrl: string;

  @Expose({ name: 'image_url' })
  imageUrl: string;

  @Expose()
  slug: string;
}
