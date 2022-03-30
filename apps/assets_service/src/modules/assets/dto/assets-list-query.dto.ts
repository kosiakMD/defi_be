import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { BaseListQueryDto } from '../../../common/dto/BaseListQuery.dto';
import { AssetsSortFieldsEnum } from '../../../common/enum/AssetsSortFields.enum';

export class AssetsListQueryDto extends BaseListQueryDto {
  @ApiProperty({
    enum: AssetsSortFieldsEnum,
    example: AssetsSortFieldsEnum.CREATED_AT,
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sortField = AssetsSortFieldsEnum.CREATED_AT;
}
