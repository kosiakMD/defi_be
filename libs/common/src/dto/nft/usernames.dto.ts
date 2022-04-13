import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class UsernamesDto {
  @Expose()
  @ApiProperty({ example: 'medium' })
  medium: string = null;

  @Expose()
  @ApiProperty({
    example: 'defiyield_app',
  })
  twitter: string = null;

  @Expose()
  @ApiProperty({
    example: 'instagram_name',
  })
  instagram: string = null;
}
