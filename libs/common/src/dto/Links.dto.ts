import { ApiProperty } from '@nestjs/swagger';

export class LinksDto {
  @ApiProperty({ type: String, example: 'safe/files/partner/logo/609520cbb1bba.png' })
  logo: string;

  @ApiProperty({ type: String, example: 'https://www.certik.org/' })
  website: string;

  @ApiProperty({ type: String, example: 'https://twitter.com/certikorg' })
  twitter: string;

  @ApiProperty({ type: String, example: 'https://medium.com/certik-foundation' })
  medium: string;

  @ApiProperty({ type: String, example: 'https://t.me/certikfoundation' })
  telegram: string;
}
