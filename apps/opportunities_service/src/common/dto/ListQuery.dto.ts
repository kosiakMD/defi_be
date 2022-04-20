import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { SortDirectionEnum } from '@app/common';
import { OpportunitySortFieldEnum } from '@app/common/enum/opportunities/opportunity.enums';

export class ListQueryDto {
  @ApiProperty({ type: String, default: '', required: false })
  @IsString()
  @IsOptional()
  search = '';

  @ApiProperty({ type: Number, default: 1, required: false })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => Math.max(1, Number(value)))
  page = 1;

  @ApiProperty({ type: Number, default: 10, required: false })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => Math.min(Math.max(1, Number(value)), 100))
  limit = 10;

  @ApiProperty({
    enum: SortDirectionEnum,
    enumName: 'SortDirectionEnum',
    example: SortDirectionEnum.desc,
    default: SortDirectionEnum.desc,
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sortDirection = SortDirectionEnum.desc;

  @ApiProperty({
    enum: OpportunitySortFieldEnum,
    enumName: 'EndpointsSortFieldEnum',
    example: OpportunitySortFieldEnum.TVL,
    default: OpportunitySortFieldEnum.TVL,
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sortField = OpportunitySortFieldEnum.TVL;
}
