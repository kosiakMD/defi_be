import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AssetCategoryEnum } from '@app/common/enum';

@Exclude()
export class AssetsCategoryDto {
  @Expose()
  @ApiProperty({ type: Number, example: 1011 })
  id: number;

  @ApiProperty({ enum: AssetCategoryEnum })
  @Expose()
  public name: AssetCategoryEnum;
}
