import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class TokenDto {
  @Expose({ name: 'token_name' })
  @ApiProperty({ type: String, example: 'COVER' })
  name: string;

  @Expose({ name: 'token_address' })
  @ApiProperty({ type: String, example: '0x5d8d9f5b96f4438195be9b99eee6118ed4304286' })
  address: string;
}
