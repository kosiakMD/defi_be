import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import {
  OpportunitySortFieldEnum,
  VaultTypeEnum,
} from '../../enum/opportunities/opportunity.enums';
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
  @Transform(({ value }) => {
    return value.toUpperCase() === SortDirectionEnum.DESC
      ? SortDirectionEnum.DESC
      : SortDirectionEnum.ASC;
  })
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

  @ApiProperty({
    type: [VaultTypeEnum],
    example: [
      VaultTypeEnum.POOL,
      VaultTypeEnum.NO_IL,
      VaultTypeEnum.SINGLE_STAKE,
      VaultTypeEnum.STABLE_POOL,
      VaultTypeEnum.LENDING,
    ],
    default: [],
    required: false,
  })
  @IsArray()
  @IsNotEmpty()
  @IsOptional()
  categories = [];

  @ApiProperty({ type: Number, default: 1000, required: false })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => Math.max(0, Number(value)))
  minTVL = 1000;

  @ApiProperty({ type: Number, default: null, required: false })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => (value ? Math.max(0, Number(value)) : null))
  maxTVL: number = null;

  @ApiProperty({ type: Number, default: 0, required: false })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => Math.max(0, Number(value)))
  minAPR = 0;

  @ApiProperty({ type: Number, default: null, required: false })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => (value ? Math.max(0, Number(value)) : null))
  maxAPR: number = null;

  @ApiProperty({ type: [Number], example: [1, 4, 12, 19], default: [], required: false })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value.map((n) => Number(n)) : [Number(value)]))
  chains = [];
}
