import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class LinksDto {
  @Expose()
  @ApiProperty({ example: 'https://supershibas.io/' })
  site: string = null;

  @Expose()
  @ApiProperty({
    example:
      'https://lh3.googleusercontent.com/rYF4Gc-9EcE7g_sbl3Aiaux5jkuq9DAe6pRe9PC7FUkFpsUAT1y3CLW-v75uJmKOXM2ST0WH-tnMvSPuvfCzBJLKY64FbthSSZwD=s120',
  })
  image: string = null;

  @Expose()
  @ApiProperty({
    example:
      'https://lh3.googleusercontent.com/j2V_S-FYmgoWnuba61apC1EPKfdzI-uIfoD6psHatOuWNXTeVHve8AZqBrt8Ze6P-u5UK12Rr1WK6o1h2DObXa7n2sKVws-aOg7hzqs=s2500',
  })
  bannerImage: string = null;

  @Expose()
  @ApiProperty({ example: 'https://t.me/durov' })
  telegramUrl: string = null;

  @Expose()
  @ApiProperty({ example: 'https://en.wikipedia.org/wiki/leet' })
  wikiUrl: string = null;

  @Expose()
  @ApiProperty({ example: 'https://discord.gg/angryapearmy' })
  discordUrl: string = null;

  //todo this is link to the asset, probably it should be moved to asset dto
  @Expose()
  @ApiProperty({
    required: false,
    example: 'https://opensea.io/assets/0xb30182ac9d2b14b7b773c52ac22a511652ee4f75/493',
  })
  permalink?: string = null;
}
