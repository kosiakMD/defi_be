import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class CollectionDto {
  @Expose()
  @ApiProperty({ example: 'Super Shiba Club' })
  name: string;

  @Expose({ name: 'external_url' })
  @ApiProperty({ example: 'https://supershibas.io/' })
  externalUrl: string;

  @Expose({ name: 'image_url' })
  @ApiProperty({
    example:
      'https://lh3.googleusercontent.com/RYF4Gc-9EcE7g_sbl3Aiaux5jkuq9DAe6pRe9PC7FUkFpsUAT1y3CLW-v75uJmKOXM2ST0WH-tnMvSPuvfCzBJLKY64FbthSSZwD=s120',
  })
  imageUrl: string;

  @Expose({ name: 'banner_image_url' })
  @ApiProperty({
    example:
      'https://lh3.googleusercontent.com/j2V_S-FYmgoWnuba61apC1EPKfdzI-uIfoD6psHatOuWNXTeVHve8AZqBrt8Ze6P-u5UK12Rr1WK6o1h2DObXa7n2sKVws-aOg7hzqs=s2500',
  })
  bannerImageUrl: string;

  @Expose({ name: 'created_date' })
  @ApiProperty({ example: '2021-09-28T03:54:14.788847' })
  createdAt: string;
}
