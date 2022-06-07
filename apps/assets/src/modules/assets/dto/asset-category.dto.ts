import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class AssetCategoryDto {
  @Expose()
  @ApiProperty()
  name: string;

  @ApiProperty()
  @Expose()
  code: string;
}
