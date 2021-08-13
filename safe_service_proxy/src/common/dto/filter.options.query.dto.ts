import { Transform } from 'class-transformer';

import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { SortDirectionEnum, SortFieldEnum } from '../enums';

export class FilterOptionsQueryDto {
  @ApiProperty({ type: Number, default: 1, required: false })
  page = 1;

  @ApiProperty({ type: Number, default: 10, required: false })
  limit = 10;

  @ApiProperty({
    enum: SortDirectionEnum,
    enumName: 'SortDirectionEnum',
    example: SortDirectionEnum.asc,
    default: SortDirectionEnum.desc,
    required: false,
  })
  sortDirection = SortDirectionEnum.desc;

  @ApiProperty({
    enum: SortFieldEnum,
    enumName: 'SortFieldEnum',
    example: SortFieldEnum.project,
    default: SortFieldEnum.project,
    required: false,
  })
  sortField = SortFieldEnum.project;

  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    value.forEach((value: string) => {
      if (!value) {
        throw new BadRequestException(`Partner id '${value}' is not valid`);
      }
    });
    return value;
  })
  @ApiProperty({ type: [String], required: false })
  partners: string[];

  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    value.forEach((value: string) => {
      if (!value) {
        throw new BadRequestException(`Chain id '${value}' is not valid`);
      }
    });
    return value;
  })
  @ApiProperty({ type: [Number], required: false })
  chains: number[];

  @ApiProperty({ type: String, example: 'zytara' })
  search: string;
}
