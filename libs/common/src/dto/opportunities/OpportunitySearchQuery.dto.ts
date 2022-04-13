import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { OpportunitySortFieldEnum } from '../../enum/opportunities/opportunity.enums';
import { SortDirectionEnum } from '../../enum/sort.direction.enum';

export class OpportunitySearchQueryDto {
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
    example: SortDirectionEnum.DESC,
    default: SortDirectionEnum.DESC,
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sortDirection = SortDirectionEnum.DESC;

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
