import { ApiProperty } from '@nestjs/swagger';

export class TokenDto {
  @ApiProperty({ type: String, example: 'COVER' })
  name: string;

  @ApiProperty({ type: String, example: '0x5d8d9f5b96f4438195be9b99eee6118ed4304286' })
  address: string;
}
