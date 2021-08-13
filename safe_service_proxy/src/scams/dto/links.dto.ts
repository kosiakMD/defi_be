import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class LinksDto {
  @Expose({ name: 'website_link' })
  @ApiProperty({ type: String, example: 'https://www.coverprotocol.com/' })
  website: string;

  @Expose({ name: 'logo_link' })
  @ApiProperty({ type: String, example: 'safe/files/scamDatabase/logo/6113d93567b08.jpeg' })
  logo: string;

  @Expose({ name: 'proof_link' })
  @ApiProperty({
    type: String,
    example:
      'https://coverprotocol.medium.com/12-28-post-mortem-34c5f9f718d4, https://rekt.news/cover-rekt/, https://www.notion.so/Cover-Infinite-Mint-Exploit-0a234cc279484982ae559bb5ab54532a#6359c6970a1b414499b76241a7e7b967',
  })
  proof: string;

  @Expose({ name: 'proof_archive_link' })
  @ApiProperty({
    type: String,
    example:
      'https://web.archive.org/web/20201114043433/https://twitter.com/value_defi/status/1327469848348160000',
  })
  proofArchive: string;

  @Expose({ name: 'webarchive_link' })
  @ApiProperty({
    type: String,
    example: 'https://web.archive.org/web/20210428165050/https://uranium.finance/',
  })
  webArchive: string;

  @Expose({ name: 'twitter_link' })
  @ApiProperty({ type: String, example: 'https://twitter.com/value_defi' })
  twitter: string;

  @Expose({ name: 'telegram_link' })
  @ApiProperty({ type: String, example: 'https://t.me/ValueDeFi' })
  telegram: string;

  @Expose({ name: 'our_post_link' })
  @ApiProperty({ type: String, example: 'https://t.me/defiyield_ann/69' })
  ourPost: string;
}
