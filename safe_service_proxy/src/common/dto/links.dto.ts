import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class LinksDto {
  @Expose({ name: 'logo_link' })
  @ApiProperty({ type: String, example: 'safe/files/partner/logo/609520cbb1bba.png' })
  logo: string;

  @Expose({ name: 'website_link' })
  @ApiProperty({ type: String, example: 'https://www.certik.org/' })
  website: string;

  @Expose({ name: 'twitter_link' })
  @ApiProperty({ type: String, example: 'https://twitter.com/certikorg' })
  twitter: string;

  @Expose({ name: 'medium_link' })
  @ApiProperty({ type: String, example: 'https://medium.com/certik-foundation' })
  medium: string;

  @Expose({ name: 'telegram_link' })
  @ApiProperty({ type: String, example: 'https://t.me/certikfoundation' })
  telegram: string;
}
