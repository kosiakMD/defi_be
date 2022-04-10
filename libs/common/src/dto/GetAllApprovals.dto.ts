import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { BaseListQueryDto } from './BaseListQuery.dto';
import { GetAllApprovalsInterface } from '../interfaces/GetAllApprovals.interface';

import { ApprovalsSortFieldsEnum } from '../enum/ApprovalsSortFields.enum';

export class GetAllApprovalsDto extends BaseListQueryDto implements GetAllApprovalsInterface {
  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    enum: ApprovalsSortFieldsEnum,
    required: false,
  })
  @IsEnum(ApprovalsSortFieldsEnum)
  @IsOptional()
  sortField: ApprovalsSortFieldsEnum = ApprovalsSortFieldsEnum.BLOCK_NUMBER;
}
