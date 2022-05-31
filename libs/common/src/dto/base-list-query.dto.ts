import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { SortDirectionEnum } from '../enum';

export class BaseListQueryDto {
  @ApiProperty({ type: Number, default: 1, required: false })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  page = 1;

  @ApiProperty({ type: Number, default: 10, required: false })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  limit = 10;

  @ApiProperty({
    enum: SortDirectionEnum,
    enumName: 'SortDirectionEnum',
    example: SortDirectionEnum.asc.toUpperCase(),
    default: SortDirectionEnum.desc.toUpperCase(),
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sortDirection = SortDirectionEnum.desc.toUpperCase();

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sortField?: string;
}
