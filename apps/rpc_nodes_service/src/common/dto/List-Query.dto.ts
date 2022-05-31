import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { EndpointsSortFieldEnum } from '../../modules/endpoints/endpoints.enums';
import { SortDirectionEnum } from '../enum/sort-direction.enum';

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
    example: SortDirectionEnum.ASC,
    default: SortDirectionEnum.DESC,
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sortDirection = SortDirectionEnum.ASC;

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
