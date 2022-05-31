import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { SortDirectionEnum } from '../../common/enum';

import { EndpointsSortFieldEnum } from '../enums/endpoints.enums';

export class ListQueryDto {
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
    example: SortDirectionEnum.asc,
    default: SortDirectionEnum.desc,
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sortDirection = SortDirectionEnum.asc;

  @ApiProperty({
    enum: EndpointsSortFieldEnum,
    enumName: 'EndpointsSortFieldEnum',
    example: EndpointsSortFieldEnum.ENDPOINT,
    default: EndpointsSortFieldEnum.ENDPOINT,
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sortField = EndpointsSortFieldEnum.ENDPOINT;
}
